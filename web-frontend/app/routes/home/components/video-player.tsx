import {
  type TrackReference,
  type TrackReferenceOrPlaceholder,
  useRoomContext,
  useTracks,
  VideoTrack,
} from '@livekit/components-react';
import { type DataPacket_Kind, type RemoteParticipant, RoomEvent, Track } from 'livekit-client';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

import { Text } from '@/components/helper/text';

import type { ILayoutDetail } from '@/schemas/types';

type ITrackList = {
  id: string | null;
  trackRef?: TrackReference | undefined;
};

type CameraEventData = {
  label: string;
  confidence: number;
  camera_id: string;
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
        className="absolute top-0 left-0 z-20 rounded-br-2xl bg-black/50 px-3 py-3 text-white opacity-0 transition-all duration-150 group-hover:opacity-100"
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

  const room = useRoomContext();
  const [cameraEvents, setCameraEvents] = useState<Record<string, CameraEventData>>({});

  useEffect(() => {
    const handleDataReceived = (
      payload: Uint8Array,
      _participant?: RemoteParticipant,
      _kind?: DataPacket_Kind,
      _topic?: string
    ) => {
      try {
        const str = new TextDecoder().decode(payload);
        const data = JSON.parse(str) as CameraEventData;
        if (data.camera_id) {
          setCameraEvents((prev) => ({ ...prev, [data.camera_id]: data }));
        }
      } catch (error) {
        console.error('Failed to parse data message', error);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

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
              eventData && eventData.label !== 'normal_event' && eventData.label !== 'Analyzing';

            return (
              <div
                key={`${track.trackRef?.participant.identity}_${id}` || `track_${id}`}
                className={cn(
                  'group relative col-span-1 row-span-1 flex h-full w-full items-center justify-center bg-black shadow-lg'
                )}
              >
                <VideoPlayer id={track.id} trackRef={track.trackRef} />
                <div
                  className={cn(
                    'absolute inset-0 z-30 ring-inset transition-all duration-150',
                    isAbnormal ? 'ring-4 ring-red-500' : 'ring-0 ring-teal-800 hover:ring-4'
                  )}
                />
                {eventData && (
                  <Text
                    type="btn"
                    className={cn(
                      'absolute bottom-0 left-0 z-20 rounded-tr-2xl bg-black/50 px-3 py-3 transition-all duration-150',
                      isAbnormal ? 'font-bold text-red-500' : 'text-white'
                    )}
                  >
                    {eventData.label} ({(eventData.confidence * 100).toFixed(1)}%)
                  </Text>
                )}
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
