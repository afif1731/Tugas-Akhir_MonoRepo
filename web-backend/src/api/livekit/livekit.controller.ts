import Elysia from 'elysia';
import { StatusCodes } from 'http-status-codes';

import { AuthPlugin, LiveKitSource, SuccessResponse } from '@/common';

import { LiveKitService } from './livekit.service';
import { EdgeDeviceQuerySchema, GenerateTokenQuerySchema } from './schema';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const LiveKitController = new Elysia({
  name: 'livekit-controller',
}).group('/livekit', app => {
  app
    .use(AuthPlugin)
    .get(
      '/access-token/website',
      async ({ query, user }) => {
        const source = LiveKitSource.WEBSITE;
        const result = await LiveKitService.generateAccessToken({
          source,
          identity: query.identity,
          user_id: user?.id,
          user_name: user?.name,
        });

        return new SuccessResponse(
          StatusCodes.OK,
          'Access token generated successfully',
          result,
        );
      },
      {
        authPlugin: {
          optional: true,
        },
        query: GenerateTokenQuerySchema,
      },
    )
    .get(
      '/access-token/device',
      async ({ query }) => {
        const source = LiveKitSource.EDGE_DEVICE;
        const result = await LiveKitService.generateAccessToken({
          source,
          device_id: query.device_id,
          camera_id: query.camera_id,
          timestamp: query.timestamp,
          signature: query.signature,
        });

        return new SuccessResponse(
          StatusCodes.OK,
          'Access token generated successfully',
          result,
        );
      },
      {
        query: EdgeDeviceQuerySchema,
      },
    )
    .use(AuthPlugin)
    .get(
      '/room',
      async () => {
        const result = await LiveKitService.getRoomList();

        return new SuccessResponse(
          StatusCodes.OK,
          'Get room list successfully',
          result,
        );
      },
      {
        authPlugin: {
          allowed_roles: ['ADMIN'],
        },
      },
    )
    .use(AuthPlugin)
    .get(
      '/participant',
      async () => {
        const result = await LiveKitService.getRoomParticipants();

        return new SuccessResponse(
          StatusCodes.OK,
          'Get room participant successfully',
          result,
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
