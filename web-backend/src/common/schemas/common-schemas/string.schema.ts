import { t } from 'elysia';

export const StringSchema = {
  phone: t.String({
    minLength: 6,
    maxLength: 30,
    error: "Phone number's length must be 6 - 30 characters",
  }),
  password: t.String({
    minLength: 8,
    maxLength: 32,
    error: 'Password must be 8-32 characters',
  }),
  text: t.String({ minLength: 1, maxLength: 256 }),
  longtext: t.String({ minLength: 1, maxLength: 512 }),
  paragraph: t.String({ minLength: 1, maxLength: 5120 }),
  uuid: t.String({ format: 'uuid' }),
  email: t.String({
    minLength: 1,
    maxLength: 256,
    format: 'email',
    error: 'Email must not be empty',
  }),
} as const;
