import { resolveSync } from 'bun';
import csv from 'csvtojson';

import { type InputJsonValue } from '../../../generated/prisma/internal/prismaNamespace';
import { type ILayoutJson, prisma } from '../../../src/common';

interface ILayout {
  id: string;
  user_id: string;
  page: string;
  layout_dimension: string;
  camera_id_list: string;
}

export const layoutSeed = async () => {
  try {
    console.log('🌱 Seed CCTV Layout');

    const datas: ILayout[] = await csv().fromFile(
      resolveSync('../data/' + 'layout.data.csv', __dirname),
    );

    for (const data of datas) {
      let userId = data.user_id;

      if (data.user_id === 'admin') {
        const user = await prisma.users.findFirst({
          where: { role: 'ADMIN' },
          select: { id: true },
        });

        userId = user!.id;
      }

      const layoutJson: ILayoutJson = {
        dimension: JSON.parse(data.layout_dimension) as number[],
        camera_ids: JSON.parse(data.camera_id_list) as string[],
      };

      const layoutPage = await prisma.cctvLayoutPages.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          user_id: userId,
          preference: 'USER_PREFERENCE',
          page: Number.parseInt(data.page),
        },
        update: {
          user_id: userId,
          preference: 'USER_PREFERENCE',
          page: Number.parseInt(data.page),
        },
        select: { id: true, layout_detail: { select: { id: true } } },
      });

      await (layoutPage.layout_detail?.id
        ? prisma.cctvLayoutDetails.update({
            where: { id: layoutPage.layout_detail.id },
            data: {
              layout_json: layoutJson as unknown as InputJsonValue,
            },
          })
        : prisma.cctvLayoutDetails.create({
            data: {
              layout_json: layoutJson as unknown as InputJsonValue,
              layout_page_id: layoutPage.id,
            },
          }));
    }
  } catch (error) {
    console.log(`❌ Error in CCTV Layout. ${error}`);
  }
};
