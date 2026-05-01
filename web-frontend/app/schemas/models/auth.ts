import * as v from 'valibot';

import { EmailSchema, PasswordSchema } from '../validators';

export const LoginSchema = v.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export type ILogin = v.InferOutput<typeof LoginSchema>;
