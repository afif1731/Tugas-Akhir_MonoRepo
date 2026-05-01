import { t } from 'elysia';

import { OrderBySchema, PaginationSchema, StringSchema } from '@/common';
import { Role } from '~/generated/prisma/enums';

export const UserPaginationQuerySchema = t.Object({
  page: PaginationSchema.pageSchema,
  perPage: PaginationSchema.perPageSchema,
  role: t.Optional(t.Enum(Role)),
  search: t.Optional(StringSchema.text),
  lite: t.Boolean({ default: false }),
  orderByName: OrderBySchema,
  orderById: OrderBySchema,
});

export type IUserPaginationQuery = typeof UserPaginationQuerySchema.static;
