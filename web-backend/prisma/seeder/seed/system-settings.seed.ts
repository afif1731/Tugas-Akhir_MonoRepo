import { resolveSync } from 'bun';
import csv from 'csvtojson';

import { prisma } from '../../../src/common';

interface ISystemSettings {
  id: string;
  video_retention_days: string;
}

export const systemSettingsSeed = async () => {
  try {
    console.log('🌱 Seed system settings');

    const datas: ISystemSettings[] = await csv().fromFile(
      resolveSync('../data/' + 'system-setting.data.csv', __dirname),
    );

    for (const data of datas) {
      await prisma.systemSettings.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          video_retention_days: Number.parseInt(data.video_retention_days),
        },
        update: {
          video_retention_days: Number.parseInt(data.video_retention_days),
        },
      });
    }
  } catch (error) {
    console.log(`❌ Error in system settings. ${error}`);
  }
};
