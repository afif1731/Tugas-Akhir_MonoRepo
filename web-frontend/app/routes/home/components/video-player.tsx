import {
  type TrackReference,
  type TrackReferenceOrPlaceholder,
  useTracks,
  VideoTrack,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';

import { Text } from '@/components/helper/text';

import type { ILayoutDetail } from '@/schemas/types';

type ITrackList = {
  id: string | null;
  trackRef?: TrackReference | undefined;
};

function mapPageTracks(
  dimension: number[],
  content: ILayoutDetail,
  tracks: TrackReferenceOrPlaceholder[]
) {
  const maxTrack = dimension[0] * dimension[1];

  const newTrack: ITrackList[] = [];

  for (let i = 0; i < maxTrack; i++) {
    newTrack.push({
      id: content.camera_ids[i] || null,
      trackRef: tracks.find((track) => {
        const trackName = 'publication' in track ? track.publication?.trackName : undefined;
        return trackName === `track_${content.camera_ids[i] || ''}`;
      }) as TrackReference | undefined,
    });
  }

  return newTrack;
}

function VideoPlayerError({
  type = 'empty',
  name,
}: {
  type: 'empty' | 'no_signal';
  name?: string;
}) {
  return (
    <div
      className={cn(
        'group relative flex h-full w-full items-center justify-center bg-black shadow-lg'
      )}
    >
      {type === 'no_signal' && (
        <>
          <Text
            type="c"
            className="absolute top-0 left-0 z-20 rounded-br-2xl bg-black/50 px-5 py-3 text-white opacity-0 transition-all duration-150 group-hover:opacity-100"
          >
            {name}
          </Text>
          <Text type="p" className="font-bold text-white">
            No Signal
          </Text>
          <div
            className={cn(
              'absolute inset-0 z-30 ring-0 ring-inset transition-all duration-150 hover:ring-4',
              'ring-slate-500'
            )}
          />
        </>
      )}
    </div>
  );
}

function VideoPlayer({ id, trackRef }: ITrackList) {
  if (!id) {
    return <VideoPlayerError type="empty" />;
  }

  if (!trackRef) {
    return <VideoPlayerError type="no_signal" name={id} />;
  }

  return (
    <>
      <Text
        type="c"
        className="absolute top-0 left-0 z-20 rounded-br-2xl bg-black/50 px-5 py-3 text-white opacity-0 transition-all duration-150 group-hover:opacity-100"
      >
        {trackRef?.participant.name}
      </Text>
      <VideoTrack
        trackRef={trackRef as TrackReference | undefined}
        className="h-full w-full object-contain"
      />
    </>
  );
}

export function LiveVideoPlayer({
  dimension,
  content,
}: {
  dimension: number[];
  content: ILayoutDetail | null;
}) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: true,
  });

  const trackList = useMemo(() => {
    if (content) {
      return mapPageTracks(dimension, content, tracks);
    }
    return [];
  }, [dimension, content, tracks]);

  return (
    <>
      {trackList.length > 0 ? (
        <div
          className={cn('grid h-full w-full items-center justify-items-center gap-2')}
          style={{
            gridTemplateColumns: `repeat(${dimension[1]}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${dimension[0]}, minmax(0, 1fr))`,
          }}
        >
          {trackList.map((track, id) => (
            <div
              key={track.trackRef?.participant.identity || `track_${id}`}
              className={cn(
                'group relative col-span-1 row-span-1 flex h-full w-full items-center justify-center bg-black shadow-lg'
              )}
            >
              <VideoPlayer id={track.id} trackRef={track.trackRef} />
              <div
                className={cn(
                  'absolute inset-0 z-30 ring-0 ring-inset transition-all duration-150 hover:ring-4',
                  'ring-teal-800'
                )}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Text type="h2" className="font-bold text-red-500">
            No Track Found...
          </Text>
        </div>
      )}
    </>
  );
}
