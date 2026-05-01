import { type Role } from '~/generated/prisma/enums';

export interface IJwtPayload {
  user_id: string;
  email: string;
  role: Role;
}
