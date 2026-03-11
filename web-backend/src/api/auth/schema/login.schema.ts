import { t } from 'elysia';
import { Role } from 'generated/prisma/enums';

import { EmailSchema, StringSchema } from '@/common';

export const LoginRequestSchema = t.Object({
  email: EmailSchema,
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
