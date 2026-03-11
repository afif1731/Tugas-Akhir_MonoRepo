import { t } from 'elysia';

export const NumberSchema = {
  natural: ({
    min = 0,
    max = 1_999_999_999,
  }: { min?: number; max?: number } = {}) =>
    t.Numeric({
      minimum: Math.max(0, min),
      maximum: max,
      multipleOf: 1,
      error: 'Number must be a natural',
    }),

  float: ({
    min = -1_999_999_999,
    max = 1_999_999_999,
  }: { min?: number; max?: number } = {}) =>
    t.Numeric({
      minimum: min,
      maximum: max,
    }),

  integer: ({
    min = -1_999_999_999,
    max = 1_999_999_999,
  }: { min?: number; max?: number } = {}) =>
    t.Numeric({
      minimum: min,
      maximum: max,
      multipleOf: 1,
      error: 'Number must be an integer',
    }),
} as const;
