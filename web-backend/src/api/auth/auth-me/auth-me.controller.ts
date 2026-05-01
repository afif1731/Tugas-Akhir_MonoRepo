import Elysia from 'elysia';
import { StatusCodes } from 'http-status-codes';

import { AuthPlugin, SuccessResponse } from '@/common';
import { CookieUtils } from '@/utils';

import { AuthMeService } from './auth-me.service';
import { UpdateMeDetailRequestSchema } from './schema';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuthMeController = new Elysia({ name: 'auth-me-controller' })
  .use(AuthPlugin)
  .group('/me', app => {
    app
      .get(
        '/',
        async ({ user }) => {
          const result = await AuthMeService.getMeDetail(user!.id);

          return new SuccessResponse(
            StatusCodes.OK,
            'Get user detail successfully',
            result,
          );
        },
        {
          authPlugin: {},
        },
      )
      .patch(
        '/',
        async ({ user, body }) => {
          const result = await AuthMeService.updateMeDetail(user!.id, body);

          return new SuccessResponse(
            StatusCodes.OK,
            'User updated successfully',
            result,
          );
        },
        {
          authPlugin: {},
          body: UpdateMeDetailRequestSchema,
        },
      )
      .delete(
        '/',
        async ({ user, cookie }) => {
          await AuthMeService.deleteMe(user!.id, user!.role);

          CookieUtils.removeTokenCookie(cookie);

          return new SuccessResponse(
            StatusCodes.OK,
            'User deleted successfully',
          );
        },
        {
          authPlugin: {},
        },
      );

    return app;
  });
