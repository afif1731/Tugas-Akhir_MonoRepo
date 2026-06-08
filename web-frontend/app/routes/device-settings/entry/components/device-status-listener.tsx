import { useDataChannel } from '@livekit/components-react';
import { useEffect, useState } from 'react';

import { usePersistentTab, useTab } from '@/hooks/store/use-persistent-tab';

import type { IEdgeDevice, IEdgeDeviceState } from '@/schemas/models';

import { EdgeDeviceListComponent, UnregisteredEdgeDeviceList } from './device-list';

export function DeviceDataListener({ devices }: { devices: IEdgeDevice[] }) {
  const { activeState } = usePersistentTab();
  const { setState: setTab } = useTab();
  const [deviceStates, setDeviceStates] = useState<IEdgeDeviceState[]>([]);
  const [unregisteredDevices, setUnregisteredDevices] = useState<IEdgeDeviceState[]>([]);

  useEffect(() => {
    setTab('unregistered_devices', `${unregisteredDevices.length}`);
  }, [unregisteredDevices.length, setTab]);

  useDataChannel('device_status', (message) => {
    try {
      const str = new TextDecoder().decode(message.payload);
      const parsed = JSON.parse(str);
      const dataArray: IEdgeDeviceState[] = Array.isArray(parsed) ? parsed : [parsed];

      setDeviceStates((prev) => {
        const next = [...prev];
        let hasChanges = false;
        dataArray.forEach((data) => {
          if (devices.some((d) => d.id === data.id)) {
            const idx = next.findIndex((s) => s.id === data.id);
            if (idx >= 0) {
              next[idx] = data;
            } else {
              next.push(data);
            }
            hasChanges = true;
          }
        });
        return hasChanges ? next : prev;
      });

      setUnregisteredDevices((prev) => {
        const next = [...prev];
        let hasChanges = false;
        dataArray.forEach((data) => {
          if (!devices.some((d) => d.id === data.id)) {
            if (!next.some((u) => u.id === data.id)) {
              next.push(data);
              hasChanges = true;
            }
          }
        });

        return hasChanges ? next : prev;
      });
    } catch (error) {
      console.error('Failed to parse device_status message', error);
    }
  });

  return activeState.edge_device === 'REGISTERED' || !activeState.edge_device ? (
    <EdgeDeviceListComponent devices={devices} states={deviceStates} />
  ) : (
    <UnregisteredEdgeDeviceList devices={unregisteredDevices} />
  );
}
