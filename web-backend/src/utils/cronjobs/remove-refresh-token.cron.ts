import cron from '@elysiajs/cron';

import { logger, prisma } from '@/common';

export const removeRefreshTokenJob = cron({
  name: 'remove-expired-refresh-tokens',
  pattern: '0 0 * * *',
  async run() {
    logger.info('Starting to remove all expired refresh tokens...');

    try {
      const today = new Date();

      const deletedTokenAmount = await prisma.refreshTokens.deleteMany({
        where: { expired_at: { lt: today } },
      });

      logger.info(`Successfully remove ${deletedTokenAmount.count} tokens`);
    } catch (error: any) {
      logger.error(`Failed to run delete query. Error: ${error}`);
    }
  },
});
