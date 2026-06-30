/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { DataPacket_Kind } from 'livekit-server-sdk';

import { logger } from '../common';
import {
  LiveKitConfig,
  LiveKitRoomClient,
} from '../common/config/livekit.config';
import {
  type ICameraCreatePatchPayload,
  type ICameraDeletePayload,
} from './schema';

// eslint-disable-next-line @typescript-eslint/naming-convention
export abstract class LiveKitPublisher {
  static async deviceAiShutdown(deviceId: string) {
    await this.sendCommand(deviceId, 'DEVICE', 'ai-shutdown');
  }

  static async deviceAiActivate(deviceId: string) {
    await this.sendCommand(deviceId, 'DEVICE', 'ai-activate');
  }

  static async cameraCreate(deviceId: string, data: ICameraCreatePatchPayload) {
    await this.sendCommand(deviceId, 'CAMERA', 'create', data);
  }

  static async cameraPatch(deviceId: string, data: ICameraCreatePatchPayload) {
    await this.sendCommand(deviceId, 'CAMERA', 'patch', data);
  }

  static async cameraDelete(deviceId: string, data: ICameraDeletePayload) {
    await this.sendCommand(deviceId, 'CAMERA', 'delete', data);
  }

  private static async sendCommand(
    deviceId: string,
    service: string,
    method: string,
    data: Record<string, any> = {}, // eslint-disable-line @typescript-eslint/no-explicit-any
  ) {
    try {
      const payload = {
        service,
        method,
        data,
      };

      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(JSON.stringify(payload));

      await LiveKitRoomClient.sendData(
        LiveKitConfig.ROOM_NAME,
        dataBytes,
        DataPacket_Kind.RELIABLE,
        { topic: `backend_request_${deviceId}` },
      );

      logger.info(
        `📤 [LiveKitPublisher] Sent ${service} ${method} command to device ${deviceId}`,
      );
    } catch (error) {
      logger.error(
        `❌ [LiveKitPublisher] Failed to send ${service} ${method} command: ${error}`,
      );
    }
  }
}
