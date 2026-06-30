/* eslint-disable unicorn/no-nested-ternary */
import { StatusCodes } from 'http-status-codes';
import { validate as isValidUuid } from 'uuid';

import { ErrorResponse, LiveKitConfig, prisma } from '@/common';
import { LiveKitPublisher } from '@/livekit-consumer/publisher';
import {
  createSlug,
  encryptTextToAES256,
  paginate,
  SampleVideoSource,
} from '@/utils';
import { type Cameras } from '~/generated/prisma/client';
import { type CameraSourceType } from '~/generated/prisma/enums';
import {
  type CamerasOrderByWithRelationInput,
  type CamerasSelect,
  type CamerasWhereInput,
} from '~/generated/prisma/models';

import {
  type ICameraListQuery,
  type ICreateCameraRequest,
  type IEditCameraRequest,
} from './schema';

export abstract class CameraService {
  static async createCamera(data: ICreateCameraRequest) {
    const cameraSlug = createSlug(data.name);

    await this.isCameraSlugExist(cameraSlug);

    await this.validateCameraSource(data.source, data.source_type);

    let rtspPassword: string | undefined;
    let rtspIv: string | undefined;
    let rtspAuthTag: string | undefined;

    if (data.source_type === 'RTSP_LINK') {
      if (!data.rtsp_username || !data.rtsp_password)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'RTSP credential required',
        );

      const encryptedPasswordObject = encryptTextToAES256(
        data.rtsp_password,
        LiveKitConfig.DEVICE_SECRET,
      );

      rtspPassword = encryptedPasswordObject.encryptedString;
      rtspIv = encryptedPasswordObject.iv;
      rtspAuthTag = encryptedPasswordObject.authTag;
    }

    if (data.device_id) {
      const device = await prisma.edgeDevices.findUnique({
        where: { id: data.device_id },
        select: {
          id: true,
          max_cameras: true,
          _count: {
            select: { cameras: true },
          },
        },
      });

      if (!device)
        throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Device not found');

      if (device.max_cameras === device._count.cameras)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'Device is already at maximum camera capacity',
        );
    }

    const newCamera = await prisma.cameras.create({
      data: {
        name: data.name,
        slug: cameraSlug,
        source: data.source,
        source_type: data.source_type,
        rtsp_username: data.rtsp_username,
        rtsp_password: rtspPassword,
        rtsp_iv: rtspIv,
        rtsp_authtag: rtspAuthTag,
        edge_device_id: data.device_id,
      },
      select: {
        id: true,
        source: true,
        source_type: true,
        rtsp_username: true,
        rtsp_password: true,
        rtsp_iv: true,
        rtsp_authtag: true,
      },
    });

    if (data.device_id) {
      await LiveKitPublisher.cameraCreate(data.device_id, {
        camera_id: newCamera.id,
        source: newCamera.source,
        source_type: newCamera.source_type,
        rtsp_username: newCamera.rtsp_username,
        rtsp_password: newCamera.rtsp_password,
        rtsp_iv: newCamera.rtsp_iv,
        rtsp_authtag: newCamera.rtsp_authtag,
      });
    }

    return { id: newCamera.id };
  }

  static async getCameraList(query: ICameraListQuery) {
    const args: {
      where: CamerasWhereInput;
      select: CamerasSelect;
      orderBy: CamerasOrderByWithRelationInput[];
    } = {
      where: {
        AND: [
          { status: query.status },
          { source_type: query.sourceType },
          {
            edge_device_id:
              query.connected === undefined
                ? undefined
                : query.connected === true
                  ? { not: null }
                  : null,
          },
          {
            OR: [
              {
                name:
                  query.search && !isValidUuid(query.search)
                    ? { contains: query.search, mode: 'insensitive' }
                    : undefined,
              },
              {
                slug:
                  query.search && !isValidUuid(query.search)
                    ? { contains: query.search, mode: 'insensitive' }
                    : undefined,
              },
              {
                id:
                  query.search && isValidUuid(query.search)
                    ? query.search
                    : undefined,
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        source_type: true,
        status: true,
      },
      orderBy: [
        { name: query.orderByName },
        { source_type: query.orderBySourceType },
        { status: query.orderByStatus },
        { id: query.orderById },
        { created_at: 'desc' },
      ],
    };

    const cameras = await paginate<Cameras, typeof args>(
      prisma.cameras,
      query.page,
      query.perPage,
      args,
    );

    return cameras;
  }

  static async getCameraDetail(camera_id: string) {
    const camera = await prisma.cameras.findUnique({
      where: { id: camera_id },
      select: {
        id: true,
        name: true,
        slug: true,
        source: true,
        source_type: true,
        edge_device_id: true,
        status: true,
        error_message: true,
        cv_treshold: true,
      },
    });

    if (!camera)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Camera not found');

    return camera;
  }

  static async editCamera(camera_id: string, data: IEditCameraRequest) {
    const currentCamera = await this.isCameraExist(camera_id);

    if (data.name) {
      const newSlug = createSlug(data.name);
      await this.isCameraSlugExist(newSlug, camera_id);
    }

    if (data.source || data.source_type)
      await this.validateCameraSource(
        data.source || currentCamera.source,
        data.source_type || currentCamera.source_type,
      );

    if (data.device_id && data.device_id !== currentCamera.edge_device_id) {
      const isDeviceExist = await prisma.edgeDevices.findUnique({
        where: { id: data.device_id },
        select: {
          id: true,
          max_cameras: true,
          _count: { select: { cameras: true } },
        },
      });

      if (!isDeviceExist)
        throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Device not found');

      if (isDeviceExist._count.cameras === isDeviceExist.max_cameras)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'Device is already at maximum camera capacity',
        );
    }

    const errorObject = data.error_message
      ? { error: data.error_message }
      : undefined;
    if (data.status === 'ERROR' && !data.error_message)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Error message required',
      );

    let rtspPassword: string | undefined;
    let rtspIv: string | undefined;
    let rtspAuthTag: string | undefined;

    if (data.rtsp_password) {
      const encryptedPasswordObject = encryptTextToAES256(
        data.rtsp_password,
        LiveKitConfig.DEVICE_SECRET,
      );

      rtspPassword = encryptedPasswordObject.encryptedString;
      rtspIv = encryptedPasswordObject.iv;
      rtspAuthTag = encryptedPasswordObject.authTag;
    }

    const updatedCamera = await prisma.cameras.update({
      where: { id: camera_id },
      data: {
        name: data.name,
        slug: data.name ? createSlug(data.name) : undefined,
        source: data.source,
        source_type: data.source_type,
        rtsp_username: data.rtsp_username,
        rtsp_password: rtspPassword,
        rtsp_iv: rtspIv,
        rtsp_authtag: rtspAuthTag,
        edge_device_id: data.device_id,
        cv_treshold: data.cv_threshold,
        status: data.status,
        error_message: errorObject,
      },
      select: {
        id: true,
        source: true,
        source_type: true,
        rtsp_username: true,
        rtsp_password: true,
        rtsp_iv: true,
        rtsp_authtag: true,
        status: true,
      },
    });

    if (currentCamera.edge_device_id) {
      if (data.device_id && currentCamera.edge_device_id !== data.device_id) {
        await LiveKitPublisher.cameraDelete(currentCamera.edge_device_id, {
          camera_id,
        });
        await LiveKitPublisher.cameraCreate(data.device_id, {
          camera_id: updatedCamera.id,
          source: updatedCamera.source,
          source_type: updatedCamera.source_type,
          rtsp_username: updatedCamera.rtsp_username,
          rtsp_password: updatedCamera.rtsp_password,
          rtsp_iv: updatedCamera.rtsp_iv,
          rtsp_authtag: updatedCamera.rtsp_authtag,
        });
      } else if (data.device_id === null) {
        await LiveKitPublisher.cameraDelete(currentCamera.edge_device_id, {
          camera_id,
        });
      } else {
        if (currentCamera.status === 'ONLINE') {
          if (data.status === 'ONLINE') {
            if (data.source || data.source_type) {
              await LiveKitPublisher.cameraPatch(currentCamera.edge_device_id, {
                camera_id: updatedCamera.id,
                source: updatedCamera.source,
                source_type: updatedCamera.source_type,
                rtsp_username: updatedCamera.rtsp_username,
                rtsp_password: updatedCamera.rtsp_password,
                rtsp_iv: updatedCamera.rtsp_iv,
                rtsp_authtag: updatedCamera.rtsp_authtag,
              });
            }
          } else {
            await LiveKitPublisher.cameraDelete(currentCamera.edge_device_id, {
              camera_id,
            });
          }
        } else if (data.status === 'ONLINE') {
          await LiveKitPublisher.cameraCreate(currentCamera.edge_device_id, {
            camera_id: updatedCamera.id,
            source: updatedCamera.source,
            source_type: updatedCamera.source_type,
            rtsp_username: updatedCamera.rtsp_username,
            rtsp_password: updatedCamera.rtsp_password,
            rtsp_iv: updatedCamera.rtsp_iv,
            rtsp_authtag: updatedCamera.rtsp_authtag,
          });
        }
      }
    } else if (data.device_id && updatedCamera.status === 'ONLINE') {
      await LiveKitPublisher.cameraCreate(data.device_id, {
        camera_id: updatedCamera.id,
        source: updatedCamera.source,
        source_type: updatedCamera.source_type,
        rtsp_username: updatedCamera.rtsp_username,
        rtsp_password: updatedCamera.rtsp_password,
        rtsp_iv: updatedCamera.rtsp_iv,
        rtsp_authtag: updatedCamera.rtsp_authtag,
      });
    }

    return true;
  }

  static async deleteCamera(camera_id: string) {
    await this.isCameraExist(camera_id);

    await prisma.cameras.delete({ where: { id: camera_id } });

    return true;
  }

  private static async isCameraExist(camera_id: string) {
    const camera = await prisma.cameras.findUnique({
      where: { id: camera_id },
      select: {
        id: true,
        source: true,
        source_type: true,
        edge_device_id: true,
        status: true,
      },
    });

    if (!camera)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Camera not found');

    return camera;
  }

  private static async isCameraSlugExist(slug: string, camera_id?: string) {
    const camera = await prisma.cameras.findFirst({
      where: camera_id
        ? { AND: [{ id: { not: camera_id } }, { slug }] }
        : { slug },
      select: { name: true },
    });

    if (camera)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        `Slug has been used by camera ${camera.name}`,
      );

    return true;
  }

  private static async validateCameraSource(
    source: string,
    source_type: CameraSourceType,
  ) {
    switch (source_type) {
      case 'STATIC_FILE': {
        const videoSamples = await SampleVideoSource.getAllSample();
        if (!videoSamples.includes(source))
          throw new ErrorResponse(
            StatusCodes.NOT_FOUND,
            'Video file not found',
          );

        return true;
      }

      default: {
        return true;
      }
    }
  }
}
