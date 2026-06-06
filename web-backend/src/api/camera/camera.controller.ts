import Elysia from 'elysia';
import { StatusCodes } from 'http-status-codes';

import { AuthPlugin, SuccessResponse } from '@/common';

import { CameraService } from './camera.service';
import {
  CameraListQuerySchema,
  CreateCameraRequestSchema,
  EditCameraRequestSchema,
} from './schema';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const CameraController = new Elysia({ name: 'camera-controller' })
  .use(AuthPlugin)
  .group('/camera', app => {
    app
      .post(
        '/',
        async ({ body }) => {
          const result = await CameraService.createCamera(body);

          return new SuccessResponse(
            StatusCodes.CREATED,
            'Camera created successfully',
            result,
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
          body: CreateCameraRequestSchema,
        },
      )
      .get(
        '/',
        async ({ query }) => {
          const result = await CameraService.getCameraList(query);

          return new SuccessResponse(
            StatusCodes.OK,
            'Get camera list successfully',
            result.data,
            result.meta,
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
          query: CameraListQuerySchema,
        },
      )
      .get(
        '/:camera_id',
        async ({ params: { camera_id } }) => {
          const result = await CameraService.getCameraDetail(camera_id);

          return new SuccessResponse(
            StatusCodes.OK,
            'Get camera detail successfully',
            result,
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
        },
      )
      .patch(
        '/:camera_id',
        async ({ params: { camera_id }, body }) => {
          await CameraService.editCamera(camera_id, body);

          return new SuccessResponse(
            StatusCodes.OK,
            'Camera edited successfully',
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
          body: EditCameraRequestSchema,
        },
      )
      .delete(
        '/:camera_id',
        async ({ params: { camera_id } }) => {
          await CameraService.deleteCamera(camera_id);

          return new SuccessResponse(
            StatusCodes.OK,
            'Camera deleted successfully',
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
        },
      );

    return app;
  });
