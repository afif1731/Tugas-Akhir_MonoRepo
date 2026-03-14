import { t } from 'elysia';
import { Role } from 'generated/prisma/enums';

import { FileSchema, StringSchema } from '@/common';

export const CreateUserRequestSchema = t.Object({
  email: StringSchema.email,
  name: StringSchema.text,
  password: StringSchema.password,
  confirm_password: StringSchema.password,
  profile_picture: t.Optional(FileSchema.image()),
  role: t.Enum(Role, { default: Role.USER }),
});

export type ICreateUserRequest = typeof CreateUserRequestSchema.static;
