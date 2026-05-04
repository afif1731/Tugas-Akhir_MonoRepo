import { LiveKitRoom } from '@livekit/components-react';
import { useEffect, useState } from 'react';

import { useIsMobile } from '@/hooks/use-mobile';
import { api } from '@/lib/axios';
import { itemStorage } from '@/lib/storage';
import { cn, handleApiResponseError } from '@/lib/utils';

import { Text } from '@/components/helper/text';
import { Button } from '@/components/ui/button';

import { LIVEKIT_TOKEN_INTERVAL } from '@/constants/time-interval';
import type { ILiveKitToken } from '@/schemas/types';

import type { Route } from './+types';
import { LiveVideoPlayer } from './components/video-player';
import { handleCctvContent, handleLiveKit } from './utils';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Home | COM-Vision' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export async function clientLoader() {
  const { initialToken, identity } = await handleLiveKit();
  const layoutDetail = await handleCctvContent();

  let defaultDimension = itemStorage.local.get<number[]>('default_dimension');

  if (layoutDetail[0].json) {
    defaultDimension = layoutDetail[0].json.dimension || null;
  }

  if (!defaultDimension) {
    defaultDimension = [2, 2];
    itemStorage.local.set('default_dimension', defaultDimension);
  }

  return {
    initialToken,
    identity,
    layoutDetail: layoutDetail[0],
    defaultDimension,
  };
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { initialToken, identity, layoutDetail, defaultDimension } = loaderData;
  const isMobile = useIsMobile();
  const serverUrl = import.meta.env.VITE_LIVEKIT_URL;

  const [token, setToken] = useState<string | null>(initialToken);
  const [dimension, _setDimension] = useState<number[]>(defaultDimension);

  useEffect(() => {
    if (!identity) return;

    const intervalId = setInterval(async () => {
      try {
        const response = await api.get<ILiveKitToken>('/livekit/access-token/website', {
          params: { identity },
        });

        setToken(response.data.token);
      } catch (error) {
        handleApiResponseError(error);
      }
    }, LIVEKIT_TOKEN_INTERVAL);

    return () => clearInterval(intervalId);
  }, [identity]);

  return (
    <main
      className={cn(
        'block w-full bg-slate-100',
        isMobile ? 'min-h-screen' : 'h-screen max-h-screen'
      )}
    >
      {token ? (
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          data-lk-theme="default"
          className="flex h-full w-full flex-col px-2 py-2"
        >
          <LiveVideoPlayer dimension={dimension} content={layoutDetail.json} />
        </LiveKitRoom>
      ) : (
        <div className="flex h-full w-full items-center justify-center gap-4">
          <Text type="h3">Failed to load Stream</Text>
          <Button variant="default" size="lg" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      )}
    </main>
  );
}
