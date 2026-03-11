import { type Cookie } from 'elysia';

import { JwtConfig } from '@/common';

export const CookieUtils = {
  generateTokenCookie(
    cookie: Record<string, Cookie<unknown>>,
    type: 'access' | 'refresh',
    value: string,
  ) {
    cookie[`${type}-cookie`].set({
      value,
      maxAge: Math.floor(
        (type === 'access'
          ? JwtConfig.JWT_ACCESS_EXPIRES_IN
          : JwtConfig.JWT_REFRESH_EXPIRES_IN) / 1000,
      ),
      httpOnly: true,
      secure: true,
      sameSite: process.env['NODE_ENV'] === 'production' ? 'lax' : 'none',
      domain: process.env.COOKIE_DOMAIN,
      path: '/',
    });
  },
  removeTokenCookie(cookie: Record<string, Cookie<unknown>>) {
    cookie['access-cookie'].set({
      value: '',
      maxAge: 0,
      httpOnly: true,
      secure: true,
      sameSite: process.env['NODE_ENV'] === 'production' ? 'lax' : 'none',
      domain: process.env.COOKIE_DOMAIN,
      path: '/',
    });

    cookie['refresh-cookie'].set({
      value: '',
      maxAge: 0,
      httpOnly: true,
      secure: true,
      sameSite: process.env['NODE_ENV'] === 'production' ? 'lax' : 'none',
      domain: process.env.COOKIE_DOMAIN,
      path: '/',
    });
  },
};
