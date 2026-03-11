import { t } from 'elysia';
import { Role } from 'generated/prisma/enums';

import { EmailSchema, StringSchema } from '@/common';

export const UserProfileResponseSchema = t.Object({
  id: StringSchema.uuid,
  name: StringSchema.text,
  email: EmailSchema,
  role: t.Enum(Role),
  created_at: t.Date(),
});

export type IUserProfileResponse = typeof UserProfileResponseSchema.static;
