import { t } from 'elysia';
import { Role } from 'generated/prisma/enums';

import { StringSchema } from '@/common';

export const GetMeDetailResponseSchema = t.Object({
  id: StringSchema.uuid,
  name: StringSchema.text,
  email: StringSchema.email,
  wa_number: t.Nullable(StringSchema.phone),
  telegram_username: t.Nullable(StringSchema.text),
  profile_picture: t.Nullable(StringSchema.text),
  role: t.Enum(Role),
});

export type IGetMeDetailResponse = typeof GetMeDetailResponseSchema.static;
