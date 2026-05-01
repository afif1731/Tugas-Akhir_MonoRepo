import { resolveSync } from 'bun';
import csv from 'csvtojson';

import { type DeviceStatus } from '../../../generated/prisma/enums';
import { prisma } from '../../../src/common';

interface IEdgeDevices {
  id: string;
  name: string;
  type: string;
  location: string;
  status: DeviceStatus;
}

function createSlug(text: string): string {
  return text
    .trim()
    .replaceAll(/\s+/g, '')
    .toLowerCase()
    .replaceAll('-', '_')
    .replaceAll(/\W/g, '');
}

export const edgeDevicesSeed = async () => {
  try {
    console.log('🌱 Seed edge devices');

    const datas: IEdgeDevices[] = await csv().fromFile(
      resolveSync('../data/' + 'edge-device.data.csv', __dirname),
    );

    for (const data of datas) {
      const slug = createSlug(data.name);
      await prisma.edgeDevices.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          slug: slug,
          name: data.name,
          type: data.type,
          location: data.location,
          status: data.status,
        },
        update: {
          slug: slug,
          name: data.name,
          type: data.type,
          location: data.location,
          status: data.status,
        },
      });
    }
  } catch (error) {
    console.log(`❌ Error in edge devices. ${error}`);
  }
};
