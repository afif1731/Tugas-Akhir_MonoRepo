import Elysia from 'elysia';
import { StatusCodes } from 'http-status-codes';

import { AuthPlugin, SuccessResponse } from '@/common';

import { EdgeDeviceService } from './edge-device.service';
import { GetAllDeviceQuerySchema, GetDeviceCameraQuerySchema } from './schema';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const EdgeDeviceController = new Elysia({
  name: 'edge-device-controller',
})
  .use(AuthPlugin)
  .group('/edge-device', app => {
    app
      .post('/', async () => {}, {
        authPlugin: { allowed_roles: ['ADMIN'] },
      })
      .get(
        '/',
        async ({ query }) => {
          const result = await EdgeDeviceService.getAllDevice(query);

          return new SuccessResponse(
            StatusCodes.OK,
            'Get device list successfully',
            result.data,
            result.meta,
          );
        },
        {
          query: GetAllDeviceQuerySchema,
          authPlugin: { allowed_roles: ['ADMIN'] },
        },
      )
      .get(
        '/:device_id',
        async ({ params: { device_id } }) => {
          const result = await EdgeDeviceService.getDeviceDetail(device_id);

          return new SuccessResponse(
            StatusCodes.OK,
            'Get device detail successfully',
            result,
          );
        },
        {
          authPlugin: { allowed_roles: ['ADMIN'] },
        },
      )
      .get(
        '/:device_id/cameras',
        async ({ query, params: { device_id } }) => {
          const result = await EdgeDeviceService.getDeviceCameras(
            device_id,
            query.timestamp,
            query.signature,
          );

          return new SuccessResponse(
            StatusCodes.OK,
            'Get device cameras successfully',
            result,
          );
        },
        {
          query: GetDeviceCameraQuerySchema,
          authPlugin: { enabled: false },
        },
      )
      .patch('/:device_id', async () => {}, {
        authPlugin: { allowed_roles: ['ADMIN'] },
      })
      .delete('/:device_id', async () => {}, {
        authPlugin: { allowed_roles: ['ADMIN'] },
      });

    return app;
  });
