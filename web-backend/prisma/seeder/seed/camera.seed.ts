import { resolveSync } from 'bun';
import csv from 'csvtojson';

import { type DeviceStatus } from '../../../generated/prisma/enums';
import { prisma } from '../../../src/common';

interface ICameras {
  id: string;
  name: string;
  status: DeviceStatus;
  edge_device_id: string;
}

function createSlug(text: string): string {
  return text
    .trim()
    .replaceAll(/\s+/g, '')
    .toLowerCase()
    .replaceAll('-', '_')
    .replaceAll(/\W/g, '');
}

export const camerasSeed = async () => {
  try {
    console.log('🌱 Seed cameras');

    const datas: ICameras[] = await csv().fromFile(
      resolveSync('../data/' + 'camera.data.csv', __dirname),
    );

    for (const data of datas) {
      const slug = createSlug(data.name);
      await prisma.cameras.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          slug: slug,
          name: data.name,
          status: data.status,
          edge_device_id: data.edge_device_id,
        },
        update: {
          slug: slug,
          name: data.name,
          status: data.status,
          edge_device_id: data.edge_device_id,
        },
      });
    }
  } catch (error) {
    console.log(`❌ Error in cameras. ${error}`);
  }
};
