import { api } from '@/lib/axios';
import { itemStorage } from '@/lib/storage';
import { handleApiResponseError } from '@/lib/utils';

import type { ILayoutPages } from '@/schemas/types';

type LayoutPreference = 'default' | 'user_preference';

export async function handleCctvContent() {
  let layoutType = itemStorage.local.get<LayoutPreference>('layout_preference');

  if (!layoutType) {
    layoutType = 'default';
    itemStorage.local.set('layout_preference', 'default');
  }

  try {
    const result = await api.get<ILayoutPages[]>('/layout/dashboard', {
      params: { preference: layoutType ?? undefined },
    });
    return result.data;
  } catch (error) {
    handleApiResponseError(error, { withToast: false });

    return [
      {
        page: 0,
        json: null,
      },
    ];
  }
}
