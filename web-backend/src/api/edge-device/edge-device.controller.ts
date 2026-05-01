import Elysia from 'elysia';

import { AuthPlugin } from '@/common';

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
      .get('/', async () => {}, {
        authPlugin: { allowed_roles: ['ADMIN'] },
      })
      .get('/:device_id', async () => {}, {
        authPlugin: { allowed_roles: ['ADMIN'] },
      })
      .patch('/:device_id', async () => {}, {
        authPlugin: { allowed_roles: ['ADMIN'] },
      })
      .delete('/:device_id', async () => {}, {
        authPlugin: { allowed_roles: ['ADMIN'] },
      });

    return app;
  });
