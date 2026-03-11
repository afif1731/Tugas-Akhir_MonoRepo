import Elysia from 'elysia';
import { type Role } from 'generated/prisma/enums';
import { StatusCodes } from 'http-status-codes';

import { JwtUtils } from '@/utils';

import { prisma } from '../config';
import { ErrorResponse } from '../responses';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuthPlugin = new Elysia({ name: 'auth-plugin' }).macro({
  authPlugin: ({
    enabled = true,
    allowed_roles,
  }: {
    enabled?: boolean;
    allowed_roles?: Role | Role[] | undefined;
  } = {}) => ({
    async resolve({ cookie }) {
      if (!enabled) return;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const token = cookie['access-cookie'].value as string | undefined;
      if (!token)
        throw new ErrorResponse(StatusCodes.UNAUTHORIZED, 'Token not found');

      const jwtPayload = JwtUtils.verifyToken(token, 'ACCESS');
      if (!jwtPayload)
        throw new ErrorResponse(StatusCodes.UNAUTHORIZED, 'Invalid Token');

      const user = await prisma.users.findUnique({
        where: {
          id: jwtPayload.user_id,
          role: jwtPayload.role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (!user)
        throw new ErrorResponse(StatusCodes.UNAUTHORIZED, 'Invalid Token');

      if (
        allowed_roles &&
        user.role !== 'ADMIN' &&
        ![...allowed_roles].some(role => user.role.includes(role))
      ) {
        throw new ErrorResponse(
          StatusCodes.FORBIDDEN,
          'This role is not allowed to access the endpoint',
        );
      }

      return { user: user };
    },
  }),
});
