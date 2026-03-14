import { t } from 'elysia';

import { StringSchema } from '@/common';

import { CreateUserRequestSchema } from './create-user.schema';

export const UpdateUserRequestSchema = t.Partial(
  t.Object({
    ...CreateUserRequestSchema.properties,
    role: t.Undefined(),
    wa_number: StringSchema.phone,
    telegram_username: StringSchema.text,
  }),
);

export type IUpdateUserRequest = typeof UpdateUserRequestSchema.static;
