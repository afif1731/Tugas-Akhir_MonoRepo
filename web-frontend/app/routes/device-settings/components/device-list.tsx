import {
  CircleDotIcon,
  CircleSlashedIcon,
  CircleXIcon,
  HardDriveIcon,
  MapPinIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Text } from '@/components/helper/text';

import type { IEdgeDevice, IEdgeDeviceState, IEdgeDeviceStatus } from '@/schemas/models';

export function EdgeDeviceListComponent({
  devices,
  states,
}: {
  devices: IEdgeDevice[];
  states?: IEdgeDeviceState[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {devices.map((device) => {
        const state = states?.find((state) => state.id === device.id);

        return <DeviceItem key={device.id} device={device} state={state} />;
      })}
    </div>
  );
}

function DeviceItem({ device, state }: { device: IEdgeDevice; state?: IEdgeDeviceState }) {
  const realStatus: IEdgeDeviceStatus = state
    ? 'ACTIVE'
    : device.status !== 'ACTIVE'
      ? device.status
      : 'No_SIGNAL';

  return (
    <div className="flex h-fit w-full flex-row items-center justify-evenly gap-6 rounded-xl bg-white px-4 py-3 drop-shadow-black/50 drop-shadow-xl">
      <HardDriveIcon
        className={cn('size-9 stroke-3', realStatus === 'ACTIVE' ? 'text-black' : 'text-slate-500')}
      />

      <div className="flex w-full flex-col items-start justify-start gap-4">
        <div className="flex w-full flex-row justify-between">
          <Text
            type="t"
            className={cn(
              'font-semibold',
              realStatus === 'ACTIVE' ? 'text-red-500' : 'text-red-300'
            )}
          >
            {device.name}
          </Text>
          <div className="flex flex-row items-center justify-start gap-1 p-0">
            <MapPinIcon className="size-4 text-slate-500" />
            <Text type="btn" className={cn('font-semibold text-slate-500')}>
              {device.location}
            </Text>
          </div>
        </div>

        <Text type="p" className="pb-2 text-moca-base">
          #{device.id}
        </Text>

        <div className="flex flex-row items-start justify-center gap-4">
          <DeviceStatusFrame>
            <Text type="btn"> Status: </Text>
            <DeviceStatusMap status={realStatus} />
          </DeviceStatusFrame>

          <DeviceStatusFrame>
            <Text type="btn"> Active Cam: </Text>
            <Text type="btn" className="font-semibold text-teal-800">
              {device._count.cameras} / {device.max_cameras}
            </Text>
          </DeviceStatusFrame>

          {realStatus === 'ACTIVE' && (
            <>
              <DeviceStatusFrame>
                <Text type="btn"> CPU: </Text>
                <Text type="btn" className="font-semibold text-teal-800">
                  {state?.cpu.toFixed(2) || '-'} %
                </Text>
              </DeviceStatusFrame>

              <DeviceStatusFrame>
                <Text type="btn"> RAM: </Text>
                <Text type="btn" className="font-semibold text-teal-800">
                  {state?.ram.toFixed(1) || '-'} GB
                </Text>
              </DeviceStatusFrame>

              <DeviceStatusFrame>
                <Text type="btn"> Storage: </Text>
                <Text type="btn" className="font-semibold text-teal-800">
                  {state?.storage.toFixed(1) || '-'} GB
                </Text>
              </DeviceStatusFrame>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DeviceStatusFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-row items-center justify-start gap-1 rounded-xl bg-slate-200 px-3 py-2 font-medium text-teal-900">
      {children}
    </div>
  );
}

function DeviceStatusMap({ status }: { status: IEdgeDeviceStatus }) {
  switch (status) {
    case 'ACTIVE':
      return (
        <div className="flex flex-row items-center justify-start gap-1 font-semibold text-green-500">
          <CircleDotIcon className="size-4 stroke-3" />
          <Text type="btn">Active</Text>
        </div>
      );
    case 'DISABLED':
      return (
        <div className="flex flex-row items-center justify-start gap-1 font-semibold text-violet-600">
          <CircleSlashedIcon className="size-4 stroke-3" />
          <Text type="btn">Disabled</Text>
        </div>
      );
    case 'ERROR':
      return (
        <div className="flex flex-row items-center justify-start gap-1 font-semibold text-red-600">
          <CircleXIcon className="size-4 stroke-3" />
          <Text type="btn">Error</Text>
        </div>
      );
    default:
      return (
        <div className="flex flex-row items-center justify-start gap-1 font-semibold text-yellow-600">
          <CircleXIcon className="size-4 stroke-3" />
          <Text type="btn">No Signal</Text>
        </div>
      );
  }
}
