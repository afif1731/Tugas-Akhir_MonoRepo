import { t } from 'elysia';

export const PaginationSchema = {
  pageSchema: t.Number({ default: 1, minimum: 1, maximum: 99 }),
  perPageSchema: t.Number({ default: 10, minimum: 1, maximum: 999 }),
};
