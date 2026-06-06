import Elysia from 'elysia';
import { StatusCodes } from 'http-status-codes';

import { AuthPlugin, SuccessResponse } from '@/common';

import {
  VideoSampleDeleteRequestSchema,
  VideoSampleUploadRequestSchema,
} from './schema';
import { SystemService } from './system.service';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const SystemController = new Elysia({ name: 'system-controller' })
  .use(AuthPlugin)
  .group('/system', app => {
    app
      .get(
        '/sample-video',
        async () => {
          const result = await SystemService.getAllVideoSample();

          return new SuccessResponse(
            StatusCodes.OK,
            'get all video samples',
            result,
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
        },
      )
      .post(
        '/sample-video',
        async ({ body }) => {
          const result = await SystemService.uploadVideoSample(body);

          return new SuccessResponse(
            StatusCodes.CREATED,
            'New sample video created',
            result,
          );
        },
        {
          authPlugin: {
            allowed_roles: 'ADMIN',
          },
          body: VideoSampleUploadRequestSchema,
        },
      )
      .delete(
        '/sample-video',
        async ({ body }) => {
          await SystemService.deleteVideoSample(body);

          return new SuccessResponse(StatusCodes.OK, 'Video sample deleted');
        },
        {
          authPlugin: {
            allowed_roles: 'ADMIN',
          },
          body: VideoSampleDeleteRequestSchema,
        },
      );

    return app;
  });
