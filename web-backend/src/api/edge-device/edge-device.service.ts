import { CryptoHasher } from 'bun';
import { StatusCodes } from 'http-status-codes';
import { validate as isValidUuid } from 'uuid';

import {
  ErrorResponse,
  type IPaginatedResult,
  LiveKitConfig,
  prisma,
} from '@/common';
import { paginate } from '@/utils';
import { type EdgeDevices } from '~/generated/prisma/client';
import {
  type EdgeDevicesOrderByWithRelationInput,
  type EdgeDevicesSelect,
  type EdgeDevicesWhereInput,
} from '~/generated/prisma/models';

import { type IGetAllDeviceQuery } from './schema/get-device.schema';

export abstract class EdgeDeviceService {
  static async registerDevice() {}

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
          select: {
            id: true,
            source: true,
            source_type: true,
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
}
