import { prisma } from '../../src/common';
import { systemSettingsSeed, usersSeed } from './seed';

async function main() {
  console.log('⚒️ Seeding for backend database...');

  try {
    await systemSettingsSeed();
    await usersSeed();

    console.log('✅ Seeding success');
  } catch (error) {
    console.error('⛔ Seeding error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
