import Elysia from 'elysia';
import { StatusCodes } from 'http-status-codes';

import { AuthPlugin, SuccessResponse } from '@/common';

import {
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  UserPaginationQuerySchema,
} from './schema';
import { UserService } from './user.service';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const UserController = new Elysia({ name: 'user-controller' })
  .use(AuthPlugin)
  .group('/user', app => {
    app
      .post(
        '/',
        async ({ body }) => {
          const result = await UserService.createNewUser(body);

          return new SuccessResponse(
            StatusCodes.CREATED,
            'New user created',
            result,
          );
        },
        {
          authPlugin: {
            allowed_roles: ['ADMIN'],
          },
          body: CreateUserRequestSchema,
        },
      )
      .get(
        '/',
        async ({ query }) => {
          const result = await UserService.getUserList(query);

          return new SuccessResponse(
            StatusCodes.OK,
            'Get user list successfully',
            result.data,
            result.meta,
          );
        },
        {
          authPlugin: {
            allowed_roles: ['ADMIN'],
          },
          query: UserPaginationQuerySchema,
        },
      )
      .get(
        '/:user_id',
        async ({ params: { user_id } }) => {
          const result = await UserService.getUserDetail(user_id);

          return new SuccessResponse(
            StatusCodes.OK,
            'Get user detail successfully',
            result,
          );
        },
        {
          authPlugin: {
            allowed_roles: ['ADMIN'],
          },
        },
      )
      .patch(
        '/:user_id',
        async ({ params: { user_id }, user, body }) => {
          const result = await UserService.updateUser(user.id, user_id, body);

          return new SuccessResponse(
            StatusCodes.OK,
            'User updated successfully',
            result,
          );
        },
        {
          authPlugin: {
            allowed_roles: ['ADMIN'],
          },
          body: UpdateUserRequestSchema,
        },
      )
      .delete(
        '/:user_id',
        async ({ params: { user_id }, user }) => {
          await UserService.deleteUser(user.id, user_id);

          return new SuccessResponse(
            StatusCodes.OK,
            'User deleted successfully',
          );
        },
        {
          authPlugin: {
            allowed_roles: ['ADMIN'],
          },
        },
      );

    return app;
  });
