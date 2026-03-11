import { t } from 'elysia';

import { EmailSchema, StringSchema } from '@/common';

export const RegisterRequestSchema = t.Object({
  email: EmailSchema,
  name: StringSchema.text,
  password: StringSchema.password,
  confirm_password: StringSchema.password,
});

export type IRegisterRequest = typeof RegisterRequestSchema.static;
