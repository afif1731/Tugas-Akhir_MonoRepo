import { t } from 'elysia';

import { OrderBySchema, PaginationSchema, StringSchema } from '@/common';
import { CameraSourceType, DeviceStatus } from '~/generated/prisma/enums';

export const CreateCameraRequestSchema = t.Object({
  name: StringSchema.text,
  source: StringSchema.longtext,
  source_type: t.Enum(CameraSourceType),
  device_id: t.Optional(StringSchema.uuid),
});

export const EditCameraRequestSchema = t.Partial(
  t.Object({
    ...CreateCameraRequestSchema.properties,
    status: t.Enum(DeviceStatus),
    error_message: StringSchema.paragraph,
    cv_threshold: t.Number({ minimum: 0, maximum: 1 }),
  }),
);

export const CameraListQuerySchema = t.Object({
  page: PaginationSchema.pageSchema,
  perPage: PaginationSchema.perPageSchema,
  sourceType: t.Optional(t.Enum(CameraSourceType)),
  status: t.Optional(t.Enum(DeviceStatus)),
  search: t.Optional(StringSchema.text),
  connected: t.Optional(t.BooleanString()),
  orderByName: OrderBySchema,
  orderByStatus: OrderBySchema,
  orderBySourceType: OrderBySchema,
  orderById: OrderBySchema,
});

export type ICreateCameraRequest = typeof CreateCameraRequestSchema.static;
export type IEditCameraRequest = typeof EditCameraRequestSchema.static;
export type ICameraListQuery = typeof CameraListQuerySchema.static;
