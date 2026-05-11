import { LiveKitRoom } from '@livekit/components-react';
import { useState } from 'react';

import useLiveKitStore from '@/hooks/store/use-livekit';
import { useIsMobile } from '@/hooks/use-mobile';
import { itemStorage } from '@/lib/storage';
import { cn, generateMeta } from '@/lib/utils';

import { Text } from '@/components/helper/text';
import { Button } from '@/components/ui/button';

import type { Route } from './+types';
import { LiveVideoPlayer } from './components/video-player';
import { handleCctvContent } from './utils';

export function meta({}: Route.MetaArgs) {
  return generateMeta('Home', 'See all CCTV Live Here!');
}

export async function clientLoader() {
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
    layoutDetail: layoutDetail[0],
    defaultDimension,
  };
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { layoutDetail, defaultDimension } = loaderData;
  const isMobile = useIsMobile();
  const serverUrl = import.meta.env.VITE_LIVEKIT_URL;

  const { token } = useLiveKitStore();
  const [dimension, _setDimension] = useState<number[]>(defaultDimension);

  return (
    <div
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
        <div className="flex h-full w-full flex-col items-center justify-center gap-4">
          <Text type="h3" className="font-semibold text-moca-darker">
            Failed to load Stream
          </Text>
          <Button variant="default" size="lg" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}
