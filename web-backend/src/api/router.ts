/* eslint-disable @typescript-eslint/naming-convention */
import Elysia from 'elysia';

import { AuthController } from './auth/auth.controller';
import { CameraController } from './camera/camera.controller';
import { EdgeDeviceController } from './edge-device/edge-device.controller';
import { LayoutController } from './layout/layout.controller';
import { LiveKitController } from './livekit/livekit.controller';
import { SystemController } from './system/system.controller';
import { UserController } from './user/user.controller';

export const ApiRouter = new Elysia({ name: 'api-router' })
  .use(AuthController)
  .use(UserController)
  .use(LiveKitController)
  .use(CameraController)
  .use(EdgeDeviceController)
  .use(LayoutController)
  .use(SystemController);
