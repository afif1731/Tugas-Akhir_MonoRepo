import { LiveKitRoom } from '@livekit/components-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import useLiveKitStore from '@/hooks/store/use-livekit';
import { useIdle } from '@/hooks/use-idle';
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
  const layoutDetails = await handleCctvContent();

  let defaultDimension = itemStorage.local.get<number[]>('default_dimension');

  if (layoutDetails[0]?.json?.dimension) {
    defaultDimension = layoutDetails[0].json.dimension;
  }

  if (!defaultDimension) {
    defaultDimension = [1, 1];
    itemStorage.local.set('default_dimension', defaultDimension);
  }

  return {
    layoutDetails,
    defaultDimension,
  };
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { layoutDetails, defaultDimension } = loaderData;
  const isMobile = useIsMobile();
  const isIdle = useIdle(3000);
  const serverUrl = import.meta.env.VITE_LIVEKIT_URL;

  const { token } = useLiveKitStore();
  const [pageIndex, setPageIndex] = useState(0);

  const isExplicitPaging = layoutDetails.length > 1 && layoutDetails[0]?.page === 1;

  const currentLayoutDetail = isExplicitPaging ? layoutDetails[pageIndex] : layoutDetails[0];
  const dimension = currentLayoutDetail?.json?.dimension || defaultDimension;
  const maxTrack = dimension[0] * dimension[1];

  const totalPages = isExplicitPaging
    ? layoutDetails.length
    : Math.ceil((currentLayoutDetail?.json?.cameras.length || 0) / maxTrack);

  const localPageIndex = isExplicitPaging ? 0 : pageIndex;

  const handleNext = () => {
    setPageIndex((prev) => (prev + 1) % totalPages);
  };

  const handlePrev = () => {
    setPageIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  return (
    <div
      className={cn(
        'relative block w-full bg-slate-100',
        'min-h-screen overflow-y-auto lg:h-screen lg:max-h-screen lg:overflow-hidden'
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
          <LiveVideoPlayer
            dimension={dimension}
            content={currentLayoutDetail?.json || null}
            pageIndex={localPageIndex}
            isMobile={isMobile}
          />
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

      {!isMobile && totalPages > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            className={cn(
              'absolute top-1/2 left-4 z-40 hidden h-12 w-12 -translate-y-1/2 rounded-full bg-white/50 shadow-md backdrop-blur-sm transition-opacity duration-300 hover:bg-white lg:flex',
              isIdle ? 'pointer-events-none opacity-0' : 'opacity-100'
            )}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className={cn(
              'absolute top-1/2 right-4 z-40 hidden h-12 w-12 -translate-y-1/2 rounded-full bg-white/50 shadow-md backdrop-blur-sm transition-opacity duration-300 hover:bg-white lg:flex',
              isIdle ? 'pointer-events-none opacity-0' : 'opacity-100'
            )}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}
    </div>
  );
}
