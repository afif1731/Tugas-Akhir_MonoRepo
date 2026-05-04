import { StatusCodes } from 'http-status-codes';
import { validate as isValidUuid } from 'uuid';

import { ErrorResponse, type IPaginatedResult, prisma } from '@/common';
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
      order: EdgeDevicesOrderByWithRelationInput[];
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
        cameras: {
          select: {
            _count: true,
          },
        },
      },
      order: [
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
}
