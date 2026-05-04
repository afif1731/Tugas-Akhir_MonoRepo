import { databasePool as databasePool, prisma } from '../../src/common';
import {
  camerasSeed,
  edgeDevicesSeed,
  layoutSeed,
  systemSettingsSeed,
  usersSeed,
} from './seed';

async function main() {
  console.log('⚒️ Seeding for backend database...');

  try {
    await systemSettingsSeed();
    await usersSeed();
    await edgeDevicesSeed();
    await camerasSeed();
    await layoutSeed();
  } catch (error) {
    console.error('⛔ Seeding error:', error);
    process.exit(1);
  } finally {
    console.log('✅ Seeding success');

    await prisma.$disconnect();
    await databasePool.end();
    process.exit(0);
  }
}

main();
