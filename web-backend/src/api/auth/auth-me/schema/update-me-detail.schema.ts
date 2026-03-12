import { t } from 'elysia';

import { FileSchema, StringSchema } from '@/common';

export const UpdateMeDetailRequestSchema = t.Partial(
  t.Object({
    name: StringSchema.text,
    old_password: StringSchema.password,
    password: StringSchema.password,
    confirm_password: StringSchema.password,
    wa_number: StringSchema.phone,
    telegram_username: StringSchema.text,
    profile_picture: FileSchema.image(),
  }),
);

export type IUpdateMeDetailRequest = typeof UpdateMeDetailRequestSchema.static;
