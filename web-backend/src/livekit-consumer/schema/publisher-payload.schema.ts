import { t } from 'elysia';

import { StringSchema } from '@/common';
import { CameraSourceType } from '~/generated/prisma/enums';

export const CameraCreatePatchPayload = t.Object({
  camera_id: StringSchema.uuid,
  source: StringSchema.longtext,
  source_type: t.Enum(CameraSourceType),
  rtsp_username: t.Nullable(StringSchema.longtext),
  rtsp_password: t.Nullable(t.String()),
  rtsp_iv: t.Nullable(t.String()),
  rtsp_authtag: t.Nullable(t.String()),
});

export const CameraDeletePayload = t.Object({
  camera_id: StringSchema.uuid,
});

export type ICameraCreatePatchPayload = typeof CameraCreatePatchPayload.static;
export type ICameraDeletePayload = typeof CameraDeletePayload.static;
