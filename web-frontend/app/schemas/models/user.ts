import * as v from 'valibot';

export const userRoleMap = {
  USER: 'User',
  ADMIN: 'Admin',
} satisfies Record<string, string>;

export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export const UserRoleSchema = v.enum(UserRole);

export const UserSchema = v.object({
  id: v.string(),
  name: v.string(),
  email: v.string(),
  role: UserRoleSchema,
  wa_number: v.nullable(v.string()),
  telegram_username: v.nullable(v.string()),
  profile_picture: v.nullable(v.string()),
});

export type IUserRole = v.InferInput<typeof UserRoleSchema>;
export type IUser = v.InferInput<typeof UserSchema>;
