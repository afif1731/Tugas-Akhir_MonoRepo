import { t } from 'elysia';
import { Prisma } from 'generated/prisma/client';

export const OrderBySchema = t.Optional(t.Enum(Prisma.SortOrder));
