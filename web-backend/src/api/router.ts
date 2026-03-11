/* eslint-disable @typescript-eslint/naming-convention */
import Elysia from 'elysia';

import { AuthController } from './auth/auth.controller';

export const ApiRouter = new Elysia({ name: 'api-router' }).use(AuthController);
