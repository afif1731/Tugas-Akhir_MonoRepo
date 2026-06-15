import { CryptoHasher } from 'bun';
import { StatusCodes } from 'http-status-codes';
import {
  v7 as uuidv7,
  validate as isValidUuid,
  version as getUUIDVersion,
} from 'uuid';

import {
  ErrorResponse,
  type IPaginatedResult,
  LiveKitConfig,
  prisma,
} from '@/common';
import { createSlug, paginate } from '@/utils';
import { type EdgeDevices } from '~/generated/prisma/client';
import {
  type EdgeDevicesOrderByWithRelationInput,
  type EdgeDevicesSelect,
  type EdgeDevicesWhereInput,
} from '~/generated/prisma/models';

import {
  type ICreateDeviceRequest,
  type IGetAllDeviceQuery,
  type IUpdateDeviceRequest,
} from './schema';

export abstract class EdgeDeviceService {
  static async getAllDevice(
    query: IGetAllDeviceQuery,
  ): Promise<IPaginatedResult<EdgeDevices>> {
    const args: {
      where: EdgeDevicesWhereInput;
      select: EdgeDevicesSelect;
      orderBy: EdgeDevicesOrderByWithRelationInput[];
    } = {
      where: {
        AND: [
          { status: query.status },
          {
            OR: [
              {
                name:
                  query.search && !isValidUuid(query.search)
                    ? { contains: query.search, mode: 'insensitive' }
                    : undefined,
              },
              {
                location:
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
        status: true,
        location: true,
        max_cameras: true,
        _count: {
          select: {
            cameras: {
              where: { status: 'ONLINE' },
            },
          },
        },
      },
      orderBy: [
        { name: query.orderByName },
        { location: query.orderByLocation },
        { id: query.orderById },
        { created_at: 'desc' },
      ],
    };

    const devices = await paginate<EdgeDevices, typeof args>(
      prisma.edgeDevices,
      query.page,
      query.perPage,
      args,
    );

    return devices;
  }

  static async getDeviceDetail(device_id: string) {
    const device = await prisma.edgeDevices.findFirst({
      where: {
        id: device_id,
      },
      include: {
        cameras: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!device)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Device not found');

    return device;
  }

  static async getDeviceCameras(
    device_id: string,
    timestamp: Date,
    signature: string,
  ) {
    const currentTime = new Date(Date.now());
    if (Math.abs(currentTime.getTime() / 1000) - timestamp.getTime() > 180)
      throw new ErrorResponse(StatusCodes.UNAUTHORIZED, 'Request is too old');

    const device = await prisma.edgeDevices.findUnique({
      where: { id: device_id },
      select: {
        id: true,
        cameras: {
          where: {
            status: 'ONLINE',
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
        },
      },
    });

    if (!device)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Device not found');

    const signaturePayload = `${device_id}:${timestamp.getTime()}`;
    const hasher = new CryptoHasher('sha256', LiveKitConfig.DEVICE_SECRET);

    hasher.update(signaturePayload);

    const signatureKey = hasher.digest('hex');

    if (signatureKey !== signature)
      throw new ErrorResponse(StatusCodes.UNAUTHORIZED, 'Invalid signature');

    return device.cameras;
  }

  static async createDevice(data: ICreateDeviceRequest) {
    if (data.id) {
      if (!isValidUuid(data.id) || getUUIDVersion(data.id) !== 7)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'Id is not in uuid v7 format',
        );

      const isDeviceExist = await prisma.edgeDevices.findUnique({
        where: { id: data.id },
        select: { id: true },
      });

      if (isDeviceExist)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          `Device for id ${data.id} is already exist`,
        );
    }

    const deviceSlug = createSlug(data.name);

    const isSlugExist = await prisma.edgeDevices.findUnique({
      where: { slug: deviceSlug },
      select: { name: true },
    });

    if (isSlugExist)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        `Device slug already used for device ${isSlugExist.name}`,
      );

    const newDevice = await prisma.edgeDevices.create({
      data: {
        id: data.id ?? uuidv7(),
        name: data.name,
        slug: deviceSlug,
        location: data.location,
        status: 'OFFLINE',
        max_cameras: data.max_cameras,
        type: data.type,
      },
      select: { id: true },
    });

    return { id: newDevice.id };
  }

  static async updateDevice(device_id: string, data: IUpdateDeviceRequest) {
    await this.isDeviceExist(device_id);

    if (data.name) {
      const newSlug = createSlug(data.name);

      const isSlugExist = await prisma.edgeDevices.findUnique({
        where: { slug: newSlug },
        select: { name: true },
      });

      if (isSlugExist)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          `Slug for this name has been used by device ${isSlugExist.name}`,
        );
    }

    if (data.max_cameras) {
      const deviceCameraCount = await prisma.cameras.count({
        where: { edge_device_id: device_id },
      });

      if (deviceCameraCount > data.max_cameras)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'Current device has more cameras than the new assigned max_cameras',
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

    await prisma.edgeDevices.update({
      where: { id: device_id },
      data: {
        name: data.name,
        slug: data.name ? createSlug(data.name) : undefined,
        type: data.type,
        location: data.location,
        max_cameras: data.max_cameras,
        status: data.status,
        error_message: errorObject,
      },
    });

    return true;
  }

  static async deleteDevice(device_id: string) {
    await this.isDeviceExist(device_id);

    await prisma.edgeDevices.delete({ where: { id: device_id } });

    return true;
  }

  private static async isDeviceExist(device_id: string) {
    const isDeviceExist = await prisma.edgeDevices.findUnique({
      where: { id: device_id },
      select: { id: true },
    });

    if (!isDeviceExist)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Device not found');

    return true;
  }
}
