import { v7 as uuidv7 } from 'uuid';

import { api } from '@/lib/axios';
import { itemStorage } from '@/lib/storage';
import { handleApiResponseError } from '@/lib/utils';

import type { ILiveKitToken } from '@/schemas/types';

export async function handleLiveKit() {
  let identity = itemStorage.local.get<string>('identity');
  if (!identity) {
    identity = `id_${uuidv7()}`;
    itemStorage.local.set('identity', identity);
  }

  try {
    const response = await api.get<ILiveKitToken>('/livekit/access-token/website', {
      params: { identity },
    });

    return {
      initialToken: response.data.token,
      identity,
    };
  } catch (error) {
    handleApiResponseError(error);

    return {
      initialToken: null,
      identity,
    };
  }
}
