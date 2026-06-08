import { valibotResolver } from '@hookform/resolvers/valibot';
import { LiveKitRoom } from '@livekit/components-react';
import { useEffect } from 'react';
import { Form, useFetcher } from 'react-router';
import { createFormData, RemixFormProvider, useRemixForm } from 'remix-hook-form';

import useLiveKitStore from '@/hooks/store/use-livekit';
import { useIsMobile } from '@/hooks/use-mobile';
import { api } from '@/lib/axios';
import { cn, generateMeta, handleApiResponseError } from '@/lib/utils';

import TitleSection from '@/components/sections/title';

import { EditDeviceSchema, type IDeviceDetail } from '@/schemas/models';

import type { Route } from './+types';
import { DeviceCameraList } from './contents/camera-list';
import { DeviceStatus, DeviceStatusContent } from './contents/device-status';
import { EditDeviceDetail } from './contents/edit-device-detail';

export function meta({}: Route.MetaArgs) {
  return generateMeta('Device Detail', 'Edit Edge Device Detail');
}

export async function clientLoader({ params: { device_id } }: Route.ClientLoaderArgs) {
  try {
    const response = await api.get<IDeviceDetail>(`/edge-device/${device_id}`);

    return { device: response.data };
  } catch (error) {
    handleApiResponseError(error, { withToast: false });
    return { device: undefined };
  }
}

export default function DeviceDetailPage({ loaderData }: Route.ComponentProps) {
  const isMobile = useIsMobile();
  const { token } = useLiveKitStore();

  const serverUrl = import.meta.env.VITE_LIVEKIT_URL;

  const { submit } = useFetcher({ key: 'edit-device' });
  const device = loaderData.device;

  const methods = useRemixForm({
    mode: 'onBlur',
    submitHandlers: {
      onValid: (data) => {
        const formData = createFormData(data, false);

        submit(formData, { method: 'POST', encType: 'multipart/form-data' });
      },
    },
    resolver: valibotResolver(EditDeviceSchema),
  });

  const { reset, handleSubmit } = methods;

  useEffect(() => {
    if (device) {
      reset({
        name: device.name ?? '',
        type: device.type ?? '',
        location: device.location ?? '',
        max_cameras: String(device.max_cameras) ?? '',
      });
    }
  }, [reset, device]);

  return (
    <>
      {device && (
        <div
          className={cn(
            'block w-full bg-slate-100 px-8 py-8',
            isMobile ? 'min-h-lvh' : 'min-h-svh'
          )}
        >
          <TitleSection
            title="Edge Device Detail"
            description={device.name}
            backTo="/device-settings"
          />

          <RemixFormProvider {...methods}>
            <Form
              id={`edit-device-${device.id}`}
              className="flex w-full flex-col gap-y-3 pt-8 lg:gap-y-5"
              onSubmit={handleSubmit}
            >
              <EditDeviceDetail />
              {token ? (
                <LiveKitRoom token={token} serverUrl={serverUrl}>
                  <DeviceStatus />
                </LiveKitRoom>
              ) : (
                <DeviceStatusContent />
              )}
              <DeviceCameraList cameras={device.cameras} />
            </Form>
          </RemixFormProvider>
        </div>
      )}
    </>
  );
}
