import { StatusCodes } from 'http-status-codes';

import { ErrorResponse, type ILayoutJson, prisma } from '@/common';
import { type Role } from '~/generated/prisma/enums';

export abstract class LayoutService {
  static async getDashboardLayout(
    preference?: string,
    user_id?: string,
    user_role?: Role,
  ) {
    if (!user_id || preference === 'default') {
      const cameras = await prisma.cameras.findMany({
        select: { id: true },
        orderBy: { created_at: 'asc' },
      });

      return [
        {
          page: 0,
          json: {
            camera_ids: cameras.map(camera => camera.id),
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

    return layout.map(item => ({
      page: item.page,
      json:
        (item.layout_detail?.layout_json as ILayoutJson | undefined) || null,
    }));
  }
}
