import { t } from 'elysia';

import { StringSchema } from '@/common';

export const RegisterRequestSchema = t.Object({
  email: StringSchema.email,
  name: StringSchema.text,
  password: StringSchema.password,
  confirm_password: StringSchema.password,
});

export type IRegisterRequest = typeof RegisterRequestSchema.static;
