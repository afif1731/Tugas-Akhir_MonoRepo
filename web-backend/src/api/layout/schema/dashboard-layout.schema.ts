import { t } from 'elysia';

import { StringSchema } from '@/common';

export const DashboardLayoutQuerySchema = t.Object({
  preference: t.Optional(StringSchema.text),
});
