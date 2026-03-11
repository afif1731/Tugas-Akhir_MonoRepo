import Elysia from 'elysia';

import { removeRefreshTokenJob } from './cronjobs';

export const systemCronjobs = new Elysia({ name: 'system-cronjobs' }).use(
  removeRefreshTokenJob,
);
