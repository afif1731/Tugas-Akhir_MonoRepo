import { type TrackReference, useTracks, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';

import { cn } from '@/lib/utils';

import { Text } from '@/components/helper/text';

export function LiveVideoPlayer() {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: true,
  });

  return (
    <div
      className={cn('grid h-full w-full grid-cols-2 items-center justify-items-center gap-auto')}
    >
      {tracks.map((trackRef) => (
        <div
          key={trackRef.participant.identity}
          className="relative flex h-full w-full items-center justify-center border border-teal-800 bg-black shadow-lg"
        >
          <Text type="c" className="absolute bottom-0 left-0 z-20 bg-white px-5 py-3">
            {trackRef?.participant.name}
          </Text>
          <VideoTrack trackRef={trackRef as TrackReference | undefined} className="w-3xl" />
        </div>
      ))}
    </div>
  );
}
