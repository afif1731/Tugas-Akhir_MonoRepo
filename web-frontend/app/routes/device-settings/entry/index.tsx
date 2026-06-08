import { LiveKitRoom } from '@livekit/components-react';
import { PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import useLiveKitStore from '@/hooks/store/use-livekit';
import { useTab } from '@/hooks/store/use-persistent-tab';
import { useIsMobile } from '@/hooks/use-mobile';
import { api } from '@/lib/axios';
import { cn, generateMeta, handleApiResponseError } from '@/lib/utils';

import { Text } from '@/components/helper/text';
import TitleSection from '@/components/sections/title';
import { Button } from '@/components/ui/button';

import type { IEdgeDevice } from '@/schemas/models';

import type { Route } from './+types';
import { DeviceDataListener, DeviceListTypeButton, EdgeDeviceListComponent } from './components';

export function meta({}: Route.MetaArgs) {
  return generateMeta('Edge Device', 'Edge Device Settings');
}

export default function CctvSettingsPage() {
  const isMobile = useIsMobile();
  const { activeState, setState } = useTab();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [devices, setDevices] = useState<IEdgeDevice[]>([]);

  const { token } = useLiveKitStore();
  const serverUrl = import.meta.env.VITE_LIVEKIT_URL;

  useEffect(() => {
    setState('unregistered_devices', '');
  }, [setState]);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setIsLoading(true);
        setIsError(false);
        const response = await api.get<IEdgeDevice>('/edge-device/', {
          isPaginated: true,
        });
        setDevices(response.data);
      } catch (error) {
        handleApiResponseError(error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDevices();
  }, []);

  return (
    <div
      className={cn(
        'block w-full bg-slate-100 px-8 py-8',
        isMobile ? 'min-h-lvh' : 'h-screen max-h-screen'
      )}
    >
      <TitleSection title="Edge Device Settings" />

      <div className="flex w-full flex-row items-center justify-between pb-4">
        <DeviceListTypeButton
          registerCount={devices.length}
          unregisterCount={
            (activeState.unregistered_devices as string | undefined) &&
            activeState.unregistered_devices !== ''
              ? Number.parseInt(activeState.unregistered_devices, 10)
              : undefined
          }
        />

        <Button asChild variant="default" size="lg" leftIcon={<PlusIcon />}>
          <Link to="/device-settings/create">Create</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex w-full items-center justify-center p-8">
          <Text type="h6" className="text-slate-500">
            Loading devices...
          </Text>
        </div>
      ) : isError ? (
        <div className="flex w-full items-center justify-center p-8">
          <Text type="h6" className="text-red-500">
            Failed to load devices.
          </Text>
        </div>
      ) : token ? (
        <LiveKitRoom token={token} serverUrl={serverUrl} connect={true}>
          <DeviceDataListener devices={devices} />
        </LiveKitRoom>
      ) : (
        <EdgeDeviceListComponent devices={devices} />
      )}
    </div>
  );
}
