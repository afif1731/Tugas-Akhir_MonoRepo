import { type RedisOptions } from 'bullmq';

export const RedisConfig: RedisOptions = {
  url: process.env.REDIS_URL,
  enableReadyCheck: true,
};
