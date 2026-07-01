// biome-ignore-all lint/suspicious/noExplicitAny: any required for now
import { PlayIcon, Trash2Icon, VideoIcon } from 'lucide-react';
import { useState } from 'react';
import { useLoaderData, useRevalidator } from 'react-router';

import useDialogStore from '@/hooks/store/use-dialog';
import { api } from '@/lib/axios';
import { cn, handleApiResponseError } from '@/lib/utils';

import { Text } from '@/components/helper/text';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

import type { IDeviceCamera } from '@/schemas/models';

import { DeviceStatusFrame, DeviceStatusMap } from '../../entry/components';
import type { clientLoader } from '..';

export function DeviceCameraList({ cameras }: { cameras: IDeviceCamera[] }) {
  const { device } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();

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
          <DeviceCamera key={`camera_${camera.id}`} camera={camera} revalidator={revalidator} />
        ))}
      </div>
    </div>
  );
}

function DeviceCamera({ camera, revalidator }: { camera: IDeviceCamera; revalidator: any }) {
  const [isLoading, setIsLoading] = useState(false);
  const { open } = useDialogStore();
  const confirmDialogId = `disconnect-camera-${camera.id}`;

  const handleDummyRecord = async () => {
    try {
      setIsLoading(true);
      await api.post(`/violence-detection/record-dummy/${camera.id}`);
      toast.success('Dummy recording triggered successfully.');
    } catch (error) {
      handleApiResponseError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCamera = async () => {
    try {
      await api.patch(`/camera/${camera.id}`, { device_id: null });
      toast.success('Camera disconnected successfully.');
      revalidator.revalidate();
    } catch (error) {
      handleApiResponseError(error);
    }
  };

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

      <div className="flex flex-row gap-2">
        <Button
          size="icon"
          variant="outline"
          colors="default"
          disabled={camera.status !== 'ONLINE' || isLoading}
          onClick={handleDummyRecord}
          title="Trigger Dummy Record"
        >
          <PlayIcon
            size={24}
            className={camera.status === 'ONLINE' ? 'text-teal-600' : 'text-slate-400'}
          />
        </Button>
        <Button
          size="icon"
          colors="destructive"
          disabled={isLoading}
          onClick={() => open(confirmDialogId)}
          title="Disconnect Camera"
        >
          <Trash2Icon size={24} className="text-white" />
        </Button>
      </div>

      <ConfirmDialog
        dialogId={confirmDialogId}
        title="Disconnect Camera"
        description="Are you sure you want to disconnect this camera from this device?"
        actionText="Disconnect"
        onConfirm={handleRemoveCamera}
      />
    </div>
  );
}
