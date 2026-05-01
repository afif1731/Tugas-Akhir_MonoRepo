import { t } from 'elysia';

import { StringSchema } from '@/common';

export const GenerateTokenQuerySchema = t.Object({
  identity: t.Optional(StringSchema.id),
});

export const EdgeDeviceQuerySchema = t.Object({
  device_id: StringSchema.uuid,
  camera_id: StringSchema.uuid,
  timestamp: t.Date(),
  signature: StringSchema.id,
});

export type IGenerateTokenQuery = typeof GenerateTokenQuerySchema.static;
export type IEdgeDeviceQuery = typeof EdgeDeviceQuerySchema.static;
