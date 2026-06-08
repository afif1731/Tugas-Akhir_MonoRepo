import { Trash2Icon, VideoIcon } from 'lucide-react';
import { useLoaderData } from 'react-router';

import { cn } from '@/lib/utils';

import { Text } from '@/components/helper/text';
import { Button } from '@/components/ui/button';

import type { IDeviceCamera } from '@/schemas/models';

import { DeviceStatusFrame, DeviceStatusMap } from '../../entry/components';
import type { clientLoader } from '..';

export function DeviceCameraList({ cameras }: { cameras: IDeviceCamera[] }) {
  const { device } = useLoaderData<typeof clientLoader>();

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-6 rounded-md border border-teal-600 bg-teal-50 p-4 sm:p-8'
      )}
    >
      <Text type="t" className="font-semibold text-teal-800">
        Connected Cameras{device ? ` (${device?.cameras?.length})` : ''}
      </Text>

      <div
        className={cn(
          'flex max-h-[500px] w-full flex-col gap-2.5 overflow-scroll rounded-md bg-slate-50 p-4 shadow-black/50 shadow-inner'
        )}
      >
        {cameras.map((camera) => (
          <DeviceCamera key={`camera_${camera.id}`} camera={camera} />
        ))}
      </div>
    </div>
  );
}

function DeviceCamera({ camera }: { camera: IDeviceCamera }) {
  return (
    <div
      className={cn(
        'flex h-24 w-full flex-row items-center justify-evenly gap-5 rounded-md bg-white px-6 py-4 shadow shadow-black/25'
      )}
    >
      <VideoIcon size={36} className="stroke-3 text-black" />

      <div className="flex h-full w-full flex-col justify-between">
        <Text type="p" className="font-semibold text-red-500">
          {camera.name}
        </Text>

        <DeviceStatusFrame>
          <DeviceStatusMap status={camera.status} />
        </DeviceStatusFrame>
      </div>

      <Button size="icon" colors="destructive">
        <Trash2Icon size={24} className="text-white" />
      </Button>
    </div>
  );
}
