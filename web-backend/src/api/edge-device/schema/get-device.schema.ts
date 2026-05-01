import { t } from 'elysia';

import { OrderBySchema, PaginationSchema, StringSchema } from '@/common';
import { DeviceStatus } from '~/generated/prisma/enums';

export const GetAllDeviceQuerySchema = t.Object({
  page: PaginationSchema.pageSchema,
  perPage: PaginationSchema.perPageSchema,
  status: t.Optional(t.Enum(DeviceStatus)),
  search: t.Optional(StringSchema.text),
  orderByName: OrderBySchema,
  orderByType: OrderBySchema,
  orderByLocation: OrderBySchema,
  orderById: OrderBySchema,
});

export const GetDeviceDetailResponseSchema = t.Object({
  id: StringSchema.uuid,
  name: StringSchema.text,
  device_type: StringSchema.text,
  error_message: t.Nullable(t.String()),
  status: t.Enum(DeviceStatus),
  cameras: t.Optional(t.Object({})),
});

export type IGetAllDeviceQuery = typeof GetAllDeviceQuerySchema.static;
