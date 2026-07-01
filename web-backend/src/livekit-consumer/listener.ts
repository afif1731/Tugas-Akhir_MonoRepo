/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unicorn/import-style */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable no-constant-condition */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable unicorn/text-encoding-identifier-case */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  type RemoteVideoTrack,
  Room,
  RoomEvent,
  TrackKind,
  VideoStream,
} from '@livekit/rtc-node';
import { sleep } from 'bun';
import { AccessToken } from 'livekit-server-sdk';

import { MailerService } from '@/api/mailer/mailer.service';
import { WhatsAppService } from '@/api/whatsapp/whatsapp.service';
import { type AnomalyType } from '~/generated/prisma/enums';

import { LiveKitConfig, logger, prisma } from '../common';
import { ViolenceThresholdConfig } from '../common/config/violence-threshold.config';
import { frameStorageService } from '../redis/frame-storage';
import { type RecordingSession, type ViolenceDetectionPayload } from './schema';

export class LivekitListener {
  private room: Room;
  private activeRecordings = new Map<string, RecordingSession>();

  constructor() {
    this.room = new Room();
  }

  public async connect() {
    try {
      const token = new AccessToken(
        LiveKitConfig.API_KEY,
        LiveKitConfig.API_SECRET,
        {
          identity: 'backend-livekit',
        },
      );
      token.addGrant({
        roomJoin: true,
        room: LiveKitConfig.ROOM_NAME,
        canPublish: true,
        canSubscribe: true,
      });
      const tokenString = await token.toJwt();

      await this.room.connect(LiveKitConfig.URL, tokenString, {
        autoSubscribe: true,
        dynacast: true,
      });

      logger.info(
        `✅ [LivekitListener] Connected to room: ${LiveKitConfig.ROOM_NAME}`,
      );

      this.room.on(
        RoomEvent.TrackSubscribed,
        (track, _publication, participant) => {
          if (track.kind === TrackKind.KIND_VIDEO) {
            logger.info(
              `📹 [LivekitListener] Subscribed to video track: ${track.name || 'unnamed'} from ${participant?.identity || 'unknown'}`,
            );

            if (!track.name) {
              logger.warn(
                '⚠️ [LivekitListener] Track name is undefined, ignoring track.',
              );

              return;
            }

            const stream = new VideoStream(track as RemoteVideoTrack);
            const reader = stream.getReader();

            (async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  const frame = value.frame;
                  const trackName = track.name!;
                  const cameraId = trackName.replace('track_', '');

                  const buffer = Buffer.from(frame.data);

                  await frameStorageService.saveFrame(trackName, buffer);

                  if (this.activeRecordings.has(cameraId)) {
                    const session = this.activeRecordings.get(cameraId)!;

                    if (session.remaining > 0) {
                      session.frames.push(buffer);
                      session.width = frame.width;
                      session.height = frame.height;
                      session.remaining--;

                      if (session.remaining === 0) {
                        this.finishRecording(session);
                        this.activeRecordings.delete(cameraId);
                      }
                    }
                  }
                }
              } catch (error) {
                logger.error(
                  `❌ [LivekitListener] VideoStream error for track ${track.name}: ${error}`,
                );
              }
            })();
          }
        },
      );

      this.room.on(
        RoomEvent.DataReceived,
        (payload, _participant, _kind, _topic) => {
          try {
            const dataString = Buffer.from(payload).toString('utf-8');
            const detection: ViolenceDetectionPayload = JSON.parse(dataString);
            this.handleViolenceDetection(detection);
          } catch (error) {
            logger.error(
              `❌ [LivekitListener] Failed to parse data channel message: ${error}`,
            );
          }
        },
      );
    } catch (error) {
      logger.error(`❌ [LivekitListener] Connection failed: ${error}`);
    }
  }

  private async handleViolenceDetection(payload: ViolenceDetectionPayload) {
    if (!payload.events || payload.events.length === 0) return;

    let highestConfidence = 0;
    let detectedLabel = '';
    let isViolent = false;

    for (const event of payload.events) {
      if (event.label === 'normal_event' || event.label === 'analyzing')
        continue;

      let threshold = ViolenceThresholdConfig.GLOBAL;

      if (!ViolenceThresholdConfig.USE_GLOBAL) {
        switch (event.label) {
          case 'assault': {
            threshold = ViolenceThresholdConfig.ASSAULT;
            break;
          }

          case 'fighting': {
            threshold = ViolenceThresholdConfig.FIGHTING;
            break;
          }

          case 'robbery': {
            threshold = ViolenceThresholdConfig.ROBBERY;
            break;
          }

          case 'shooting': {
            threshold = ViolenceThresholdConfig.SHOOTING;
            break;
          }
        }
      }

      if (event.confidence > threshold) {
        isViolent = true;

        if (event.confidence > highestConfidence) {
          highestConfidence = event.confidence;
          detectedLabel = event.label;
        }
      }
    }

    const recentRecording = await prisma.detectedAnomalies.findFirst({
      where: { camera_id: payload.camera_id },
      select: { created_at: true },
      orderBy: { created_at: 'desc' },
    });
    const currentDate = new Date(Date.now());

    if (isViolent && !this.activeRecordings.has(payload.camera_id)) {
      if (
        recentRecording &&
        recentRecording.created_at.getTime() + 60_000 < currentDate.getTime()
      ) {
        logger.info(
          `💤 [LiveKit Listener] Violence Recording for camera ${payload.camera_id} is on 1 minute cooldown (${recentRecording.created_at.getTime() + 60_000 < currentDate.getTime()})`,
        );

        return;
      }

      logger.info(
        `🚨 [LivekitListener] Violence detected on ${payload.camera_id} (${detectedLabel}: ${highestConfidence}). Starting 200 frame capture...`,
      );

      const trackName = `track_${payload.camera_id}`;

      const previousFrames = await frameStorageService.getFrames(trackName);
      previousFrames.reverse();

      this.activeRecordings.set(payload.camera_id, {
        cameraId: payload.camera_id,
        frames: previousFrames,
        remaining: 200,
        payload: payload,
        highestConfidence,
        detectedLabel,
      });
    }
  }

  private async finishRecording(session: RecordingSession) {
    logger.info(
      `🎥 [LivekitListener] Finished collecting frames for ${session.cameraId}. Encoding video...`,
    );

    if (!session.width || !session.height || session.frames.length === 0) {
      logger.error('❌ [LivekitListener] Invalid session data for recording.');

      return;
    }

    const folderPath = join(
      process.cwd(),
      process.env.FILE_STORAGE_PATH || 'uploads',
      'violence-detection',
    );

    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }

    const fileName = `${Date.now()}-${session.cameraId}.mp4`;
    const outputPath = join(folderPath, fileName);

    const width = session.width;
    const height = session.height;
    const firstFrameSize = session.frames[0].length;

    let pixFmt = 'rgba';

    switch (firstFrameSize) {
      case width * height * 4: {
        pixFmt = 'rgba';
        break;
      }

      case width * height * 3: {
        pixFmt = 'rgb24';
        break;
      }

      case width * height * 1.5: {
        pixFmt = 'yuv420p';
        break;
      }

      default: {
        logger.warn(
          `⚠️ [LivekitListener] Unknown pixel format for size ${firstFrameSize} (WxH: ${width}x${height}). Defaulting to rgba.`,
        );
      }
    }

    const fps = session.payload.fps || 30;

    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-f',
      'rawvideo',
      '-vcodec',
      'rawvideo',
      '-s',
      `${width}x${height}`,
      '-pix_fmt',
      pixFmt,
      '-r',
      fps.toString(),
      '-i',
      '-',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-pix_fmt',
      'yuv420p',
      outputPath,
    ]);

    ffmpeg.on('error', error => {
      logger.error(
        `❌ [LivekitListener] FFmpeg error for ${session.cameraId}: ${error}`,
      );
    });

    ffmpeg.on('close', async code => {
      if (code === 0) {
        logger.info(
          `✅ [LivekitListener] Video saved successfully to ${outputPath}`,
        );
        await this.saveAnomalyToDB(session, `violence-detection/${fileName}`);
      } else {
        logger.error(`❌ [LivekitListener] FFmpeg exited with code ${code}`);
      }
    });

    // Write all buffers sequentially with backpressure handling to prevent data corruption
    for (const frame of session.frames) {
      if (ffmpeg.stdin.destroyed) break;
      const canWrite = ffmpeg.stdin.write(frame);

      if (!canWrite) {
        await new Promise<void>(resolve => {
          ffmpeg.stdin.once('drain', resolve);
          ffmpeg.stdin.once('error', resolve);
        });
      }
    }

    if (!ffmpeg.stdin.destroyed) {
      ffmpeg.stdin.end();
    }
  }

  private async saveAnomalyToDB(
    session: RecordingSession,
    relativeVideoPath: string,
  ) {
    try {
      let anomalyType: AnomalyType = 'ASSAULT';

      switch (session.detectedLabel) {
        case 'assault': {
          anomalyType = 'ASSAULT';
          break;
        }

        case 'fighting': {
          anomalyType = 'FIGHTING';
          break;
        }

        case 'robbery': {
          anomalyType = 'ROBBERY';
          break;
        }

        case 'shooting': {
          anomalyType = 'SHOOTING';
          break;
        }
      }

      const duration = Math.round(
        session.frames.length / (session.payload.fps || 30),
      );

      const camera = await prisma.cameras.findUnique({
        where: { id: session.cameraId },
        select: { id: true, name: true },
      });
      const systemSettings = await prisma.systemSettings.findFirst();

      const videoStartDate = new Date(Date.now() - duration * 1000);

      const newFootage = await prisma.detectedAnomalies.create({
        data: {
          camera_id: session.cameraId,
          video_path: relativeVideoPath,
          video_duration: duration,
          anomaly_type: anomalyType,
          confidence: session.highestConfidence,
          is_reported:
            !systemSettings?.report_auto_send_wa &&
            !systemSettings?.report_auto_send_email
              ? false
              : true,
          report_sent: {},
          video_start_date: videoStartDate,
          video_end_date: new Date(),
        },
        select: { id: true },
      });

      if (systemSettings!.report_auto_send_email) {
        const emailList = await prisma.emailReceivers.findMany({
          where: { is_activated: true },
          select: { email: true },
        });

        await MailerService.sendViolenceReportMail(
          emailList.map(receiver => receiver.email),
          'MOCA-Vision Admin',
          camera?.name || 'Unnamed Camera',
          session.detectedLabel,
          session.highestConfidence,
          newFootage.id,
          videoStartDate,
        );

        logger.info(`📨 [EmailSender] Report Sended to Emails`);
      }

      if (systemSettings!.report_auto_send_wa) {
        const waReceiverList = await prisma.waReceivers.findMany({
          where: { is_activated: true },
          select: { name: true, wa_chat_id: true, is_group: true },
        });

        for (const waReceiver of waReceiverList) {
          await WhatsAppService.sendViolenceDetection(
            waReceiver.name,
            camera?.name || 'Unnamed Camera',
            waReceiver.wa_chat_id,
            waReceiver.is_group,
            session.detectedLabel,
            session.highestConfidence,
            newFootage.id,
            videoStartDate,
          );

          sleep(1000);
        }

        logger.info(`💚 [WhatsappSender] Report Sended to Whatsapps`);
      }

      logger.info(
        `💾 [LivekitListener] Anomaly data saved to database for ${session.cameraId}`,
      );
    } catch (error) {
      logger.error(
        `❌ [LivekitListener] Failed to save anomaly to DB: ${error}`,
      );
    }
  }

  public async triggerDummyRecording(cameraId: string) {
    logger.info(
      `🧪 [LivekitListener] Dummy recording triggered for ${cameraId}`,
    );
    const dummyPayload: ViolenceDetectionPayload = {
      camera_id: cameraId,
      fps: 30,
      events: [
        {
          group_id: 1,
          label: 'assault',
          confidence: 0.99,
          skeletons: [],
        },
      ],
    };
    await this.handleViolenceDetection(dummyPayload);
  }
}

export const livekitListener = new LivekitListener();
