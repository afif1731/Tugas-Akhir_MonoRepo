import { useEffect } from 'react';
import { v7 as uuidv7 } from 'uuid';
import { create } from 'zustand';

import { api } from '@/lib/axios';
import { itemStorage } from '@/lib/storage';
import { handleApiResponseError } from '@/lib/utils';

import { LIVEKIT_TOKEN_INTERVAL } from '@/constants/time-interval';
import type { ILiveKitToken } from '@/schemas/types';

type LiveKitState = {
  token: string | null;
  identity: string | null;
  setToken: (token: string | null) => void;
  fetchToken: (identity: string) => Promise<void>;
  getInitialToken: () => Promise<void>;
};

const useLiveKitStore = create<LiveKitState>((set) => ({
  token: null,
  identity: null,
  setToken: (token) => set({ token }),
  fetchToken: async (identity: string) => {
    try {
      const response = await api.get<ILiveKitToken>('/livekit/access-token/website', {
        params: { identity },
      });

      set({ token: response.data.token });
    } catch (error) {
      handleApiResponseError(error);
    }
  },
  getInitialToken: async () => {
    let identity = itemStorage.local.get<string>('identity');
    if (!identity) {
      identity = `id_${uuidv7()}`;
      itemStorage.local.set('identity', identity);
    }
    set({ identity });

    try {
      const response = await api.get<ILiveKitToken>('/livekit/access-token/website', {
        params: { identity },
      });

      set({ token: response.data.token });
    } catch (error) {
      handleApiResponseError(error);
      set({ token: null });
    }
  },
}));

export const useLiveKitInit = () => {
  const getInitialToken = useLiveKitStore((state) => state.getInitialToken);
  const fetchToken = useLiveKitStore((state) => state.fetchToken);
  const identity = useLiveKitStore((state) => state.identity);

  useEffect(() => {
    getInitialToken();
  }, [getInitialToken]);

  useEffect(() => {
    if (!identity) return;

    const intervalId = setInterval(() => {
      fetchToken(identity);
    }, LIVEKIT_TOKEN_INTERVAL);

    return () => clearInterval(intervalId);
  }, [identity, fetchToken]);
};

export default useLiveKitStore;
