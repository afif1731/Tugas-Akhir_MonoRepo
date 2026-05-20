import { type DefaultArgs } from '@prisma/client/runtime/client';
import { StatusCodes } from 'http-status-codes';

import {
  ErrorResponse,
  type IDatabaseLayoutJson,
  type ILayoutJson,
  prisma,
} from '@/common';
import { type Role } from '~/generated/prisma/enums';
import { type GlobalOmitConfig } from '~/generated/prisma/internal/prismaNamespace';
import { type Prisma__CamerasClient } from '~/generated/prisma/models';

export abstract class LayoutService {
  static async getDashboardLayout(
    preference?: string,
    user_id?: string,
    user_role?: Role,
  ) {
    if (!user_id || preference === 'default') {
      const cameras = await prisma.cameras.findMany({
        select: { id: true, name: true },
        orderBy: { created_at: 'asc' },
      });

      return [
        {
          page: 0,
          json: {
            cameras: cameras.map(camera => ({
              id: camera.id,
              name: camera.name,
              show_skeleton: true,
              show_box: true,
            })),
          } as ILayoutJson,
        },
      ];
    }

    if (!user_id || !user_role)
      throw new ErrorResponse(StatusCodes.BAD_REQUEST, 'User required');

    const layout = await prisma.cctvLayoutPages.findMany({
      where: { user_id },
      select: {
        page: true,
        layout_detail: {
          select: {
            layout_json: true,
          },
        },
      },
      orderBy: {
        page: 'asc',
      },
    });

    const uniqueCameraIds = [
      ...new Set(
        layout.flatMap(
          item =>
            (
              item.layout_detail?.layout_json as unknown as IDatabaseLayoutJson
            ).cameras.map(camera => camera.id) ?? [],
        ),
      ),
    ];

    const getPrismaCameras: Prisma__CamerasClient<
      {
        id: string;
        name: string;
      } | null,
      null,
      DefaultArgs,
      {
        omit: GlobalOmitConfig | undefined;
      }
    >[] = [];

    for (const cameraId of uniqueCameraIds) {
      getPrismaCameras.push(
        prisma.cameras.findUnique({
          where: { id: cameraId },
          select: { id: true, name: true },
        }),
      );
    }

    const cameras = await prisma.$transaction(getPrismaCameras);

    const result: { page: number; json: ILayoutJson }[] = layout.map(item => ({
      page: item.page,
      json: {
        dimension: (
          item.layout_detail?.layout_json as unknown as IDatabaseLayoutJson
        ).dimension,
        cameras: (
          item.layout_detail?.layout_json as unknown as IDatabaseLayoutJson
        ).cameras.map(camera => ({
          id: camera.id,
          name:
            cameras.find(databaseCamera => databaseCamera?.id === camera.id)
              ?.name || 'Unknown Camera',
          show_skeleton: camera.show_skeleton,
          show_box: camera.show_box,
        })),
      },
    }));

    return result;
  }
}
