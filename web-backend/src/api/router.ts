/* eslint-disable @typescript-eslint/naming-convention */
import Elysia from 'elysia';

import { AuthController } from './auth/auth.controller';
import { LayoutController } from './layout/layout.controller';
import { LiveKitController } from './livekit/livekit.controller';
import { UserController } from './user/user.controller';

export const ApiRouter = new Elysia({ name: 'api-router' })
  .use(AuthController)
  .use(UserController)
  .use(LiveKitController)
  .use(LayoutController);
