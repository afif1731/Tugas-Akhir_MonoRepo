/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { PrismaClient } from '../../../generated/prisma/client';
import { logger } from './logger.config';

const connectionString = process.env.DATABASE_URL!;

export const databasePool = new Pool({ connectionString });
const adapter = new PrismaPg(databasePool);

export const prisma = new PrismaClient({
  adapter,
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'info', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
  errorFormat: 'pretty',
});

prisma.$on('query', async event => {
  const executionTime = event.duration;
  const slowQueryThreshold = 2000;

  if (executionTime > slowQueryThreshold) {
    logger.warn({
      type: 'slow-query',
      query: event.query,
      params: event.params,
      duration: `${executionTime}ms`,
      target: event.target,
    });
  }
});
