import {
  type TrackReference,
  type TrackReferenceOrPlaceholder,
  useDataChannel,
  useTracks,
  VideoTrack,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

import { Text } from '@/components/helper/text';

import type { ILayoutDetail, ViolenceDetectionPayload } from '@/schemas/types';

import { SkeletonOverlay } from './skeleton-overlay';

interface ITrackList {
  id: string | null;
  name: string;
  trackRef?: TrackReference | undefined;
  show_skeleton?: boolean;
  show_box?: boolean;
}

interface IVideoPlayer extends ITrackList {
  eventData?: ViolenceDetectionPayload | undefined;
  isAbnormal?: boolean | undefined;
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

  const [cameraEvents, setCameraEvents] = useState<Record<string, ViolenceDetectionPayload>>({});

  useDataChannel('violence_detection', (message) => {
    try {
      const str = new TextDecoder().decode(message.payload);
      const data = JSON.parse(str) as ViolenceDetectionPayload;
      console.log(data);
      if (data.camera_id) {
        setCameraEvents((prev) => ({ ...prev, [data.camera_id]: data }));
      }
    } catch (error) {
      console.error('Failed to parse data message', error);
    }
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
          {trackList.map((track, id) => {
            const eventData = track.id ? cameraEvents[track.id] : undefined;
            const isAbnormal =
              eventData?.events?.some(
                (e) => e.label !== 'normal_event' && e.label !== 'Analyzing'
              ) || false;

            return (
              <div
                key={`${track.trackRef?.participant.identity}_${id}` || `track_${id}`}
                className={cn(
                  'group relative col-span-1 row-span-1 flex h-full w-full items-center justify-center bg-black shadow-lg'
                )}
              >
                <VideoPlayer
                  id={track.id}
                  name={track.name}
                  trackRef={track.trackRef}
                  eventData={eventData}
                  isAbnormal={isAbnormal}
                  show_skeleton={track.show_skeleton}
                  show_box={track.show_box}
                />
              </div>
            );
          })}
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

function mapPageTracks(
  dimension: number[],
  content: ILayoutDetail,
  tracks: TrackReferenceOrPlaceholder[]
) {
  const maxTrack = dimension[0] * dimension[1];

  const newTrack: ITrackList[] = [];

  for (let i = 0; i < maxTrack; i++) {
    const camera = content.cameras[i];
    newTrack.push({
      id: camera?.id || null,
      name: camera?.name || '',
      show_skeleton: camera?.show_skeleton ?? true,
      show_box: camera?.show_box ?? true,
      trackRef: tracks.find((track) => {
        const trackName = 'publication' in track ? track.publication?.trackName : undefined;
        return trackName === `track_${camera?.id || ''}`;
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

function VideoPlayer({
  id,
  name,
  trackRef,
  isAbnormal,
  eventData,
  show_skeleton,
  show_box,
}: IVideoPlayer) {
  if (!id) {
    return <VideoPlayerError type="empty" />;
  }

  if (!trackRef) {
    return <VideoPlayerError type="no_signal" name={name} />;
  }

  return (
    <>
      <Text
        type="c"
        className="absolute top-0 left-0 z-20 rounded-br-2xl bg-black/50 px-3 py-3 text-white opacity-0 transition-all duration-150 group-hover:opacity-100"
      >
        {name}
      </Text>
      <VideoTrack
        trackRef={trackRef as TrackReference | undefined}
        className="h-full w-full object-contain"
      />
      <SkeletonOverlay eventData={eventData} showSkeleton={show_skeleton} showBox={show_box} />

      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-30 ring-inset transition-all duration-150',
          isAbnormal ? 'ring-4 ring-red-500' : 'ring-0 ring-teal-800 hover:ring-4'
        )}
      />
      {eventData && (
        <>
          {eventData.events && eventData.events.length > 0 && (
            <Text
              type="btn"
              className={cn(
                'absolute bottom-0 left-0 z-40 rounded-tr-2xl bg-black/50 px-3 py-3 transition-all duration-150',
                isAbnormal ? 'font-bold text-red-500' : 'text-white'
              )}
            >
              {(() => {
                const abnormal = eventData.events.find(
                  (e) => e.label !== 'normal_event' && e.label !== 'Analyzing'
                );
                const displayEvent = abnormal || eventData.events[0];
                return `${displayEvent.label} (${(displayEvent.confidence * 100).toFixed(1)}%)`;
              })()}
            </Text>
          )}

          <Text
            type="btn"
            className={cn(
              'absolute right-0 bottom-0 z-40 rounded-tl-2xl bg-black/50 px-3 py-3',
              'text-white'
            )}
          >
            {eventData.fps} FPS
          </Text>
        </>
      )}
    </>
  );
}
