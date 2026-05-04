import Elysia from 'elysia';
import { StatusCodes } from 'http-status-codes';

import { AuthPlugin, SuccessResponse } from '@/common';

import { LayoutService } from './layout.service';
import { DashboardLayoutQuerySchema } from './schema';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const LayoutController = new Elysia({ name: 'layout-controller' }).group(
  '/layout',
  app => {
    app.use(AuthPlugin).get(
      '/dashboard',
      async ({ query, user }) => {
        const result = await LayoutService.getDashboardLayout(
          query.preference,
          user?.id,
          user?.role,
        );

        return new SuccessResponse(
          StatusCodes.OK,
          'Get dashboard layout successfully',
          result,
        );
      },
      {
        query: DashboardLayoutQuerySchema,
        authPlugin: {
          optional: true,
        },
      },
    );

    return app;
  },
);
