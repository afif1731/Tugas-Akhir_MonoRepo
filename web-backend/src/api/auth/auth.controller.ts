import Elysia from 'elysia';
import { StatusCodes } from 'http-status-codes';

import { AuthPlugin, SuccessResponse } from '@/common';
import { CookieUtils } from '@/utils';

import { AuthService } from './auth.service';
import { LoginRequestSchema, RegisterRequestSchema } from './schema';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuthController = new Elysia({ name: 'auth-controller' }).group(
  '/auth',
  app => {
    app
      .post(
        '/login',
        async ({ body, cookie }) => {
          const refreshToken = cookie['refresh-cookie']?.value;

          const result = await AuthService.loginService(body, refreshToken);

          CookieUtils.removeTokenCookie(cookie);

          CookieUtils.generateTokenCookie(
            cookie,
            'access',
            result.access_token,
          );
          CookieUtils.generateTokenCookie(
            cookie,
            'refresh',
            result.refresh_token,
          );

          return new SuccessResponse(
            StatusCodes.OK,
            'Login successfully',
            result.user,
          );
        },
        {
          body: LoginRequestSchema,
        },
      )
      .post(
        '/register',
        async ({ body }) => {
          await AuthService.registerService(body);

          return new SuccessResponse(
            StatusCodes.CREATED,
            'Register successfully',
          );
        },
        {
          body: RegisterRequestSchema,
        },
      )
      .post('/refresh-token', async ({ cookie }) => {
        const refreshToken = cookie['refresh-cookie']?.value;

        const result = await AuthService.refreshToken(refreshToken);

        CookieUtils.removeTokenCookie(cookie);

        CookieUtils.generateTokenCookie(cookie, 'access', result.access_token);

        CookieUtils.generateTokenCookie(
          cookie,
          'refresh',
          result.refresh_token,
        );

        return new SuccessResponse(StatusCodes.OK, 'Tokens updated');
      })
      .post('/logout', async ({ cookie }) => {
        const refreshToken = cookie['refresh-cookie']?.value;

        await AuthService.logoutService(refreshToken);

        CookieUtils.removeTokenCookie(cookie);

        return new SuccessResponse(StatusCodes.OK, 'Logout successfully');
      })
      .use(AuthPlugin)
      .get(
        '/me',
        async ({ user }) => {
          const result = await AuthService.getUserDetail(user.id);

          return new SuccessResponse(
            StatusCodes.OK,
            'Get user detail successfully',
            result,
          );
        },
        {
          authPlugin: {},
        },
      );

    return app;
  },
);
