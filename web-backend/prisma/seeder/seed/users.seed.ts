import { password, resolveSync } from 'bun';
import csv from 'csvtojson';

import { type Role } from '../../../generated/prisma/enums';
import { prisma } from '../../../src/common';

interface IUsers {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
}

export const usersSeed = async () => {
  try {
    console.log('🌱 Seed users');

    const datas: IUsers[] = await csv().fromFile(
      resolveSync('../data/' + 'user.data.csv', __dirname),
    );

    // Seeding the default admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@moca-vision.com';
    const adminName = process.env.ADMIN_NAME || 'Admin';
    const adminPassword = process.env.ADMIN_PASSWORD || '12345678';

    const adminHashedPassword = await password.hash(adminPassword, 'bcrypt');

    const isAdminExist = await prisma.users.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true, email: true },
    });

    if (isAdminExist && isAdminExist.email === adminEmail) {
      await prisma.users.update({
        where: { id: isAdminExist.id },
        data: {
          name: adminName,
          password: adminHashedPassword,
          role: 'ADMIN',
        },
      });
    } else if (!isAdminExist) {
      await prisma.users.create({
        data: {
          name: adminName,
          email: adminEmail,
          password: adminHashedPassword,
          role: 'ADMIN',
        },
      });
    }

    for (const data of datas) {
      const hashedPassword = await password.hash(data.password, 'bcrypt');

      await prisma.users.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: data.role,
        },
        update: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: data.role,
        },
      });
    }
  } catch (error) {
    console.log(`❌ Error in users. ${error}`);
  }
};
