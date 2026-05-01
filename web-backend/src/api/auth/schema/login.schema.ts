import { t } from 'elysia';

import { StringSchema } from '@/common';
import { Role } from '~/generated/prisma/enums';

export const LoginRequestSchema = t.Object({
  email: StringSchema.email,
  password: StringSchema.password,
});

export const LoginResponseSchema = t.Object({
  access_token: t.String(),
  refresh_token: t.String(),
  user: t.Object({
    id: StringSchema.uuid,
    name: StringSchema.text,
    role: t.Enum(Role),
  }),
});

export type ILoginRequest = typeof LoginRequestSchema.static;
export type ILoginResponse = typeof LoginResponseSchema.static;
