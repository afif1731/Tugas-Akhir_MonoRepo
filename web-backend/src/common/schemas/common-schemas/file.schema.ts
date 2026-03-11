import { type MaybeArray, t } from 'elysia';
import { type FileType, type FileUnit } from 'elysia/dist/type-system/types';

import { ALLOWED_IMAGE_TYPE } from '@/common/constants';

export const FileSchema = {
  image: (max_size?: FileUnit) =>
    t.File({
      type: ALLOWED_IMAGE_TYPE,
      maxSize: max_size || '2m',
    }),
  file: (type: MaybeArray<FileType>, max_size?: FileUnit) =>
    t.File({
      type,
      maxSize: max_size || '2m',
    }),
} as const;
