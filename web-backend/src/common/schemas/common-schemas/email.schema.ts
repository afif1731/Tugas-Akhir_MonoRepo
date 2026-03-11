import { t } from 'elysia';

export const EmailSchema = t.String({
  minLength: 1,
  maxLength: 256,
  format: 'email',
  error: 'Email must not be empty',
});
