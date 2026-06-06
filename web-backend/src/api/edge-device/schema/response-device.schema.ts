import { t } from 'elysia';

import { StringSchema } from '@/common';
import { DeviceStatus } from '~/generated/prisma/enums';

export const GetDeviceDetailResponseSchema = t.Object({
  id: StringSchema.uuid,
  name: StringSchema.text,
  device_type: StringSchema.text,
  error_message: t.Nullable(t.String()),
  status: t.Enum(DeviceStatus),
  cameras: t.Optional(t.Object({})),
});
