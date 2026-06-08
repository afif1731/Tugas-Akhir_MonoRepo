import { usePersistentTab } from '@/hooks/store/use-persistent-tab';
import { cn } from '@/lib/utils';

import { Text } from '@/components/helper/text';
import { Button } from '@/components/ui/button';

type IListType = 'REGISTERED' | 'UNREGISTERED';

export function DeviceListTypeButton({
  registerCount,
  unregisterCount,
}: {
  registerCount?: number;
  unregisterCount?: number;
}) {
  return (
    <div className="flex flex-row rounded-md bg-white px-3 py-2 shadow-black-50 shadow-xl">
      <DeviceListButtonEntity
        type="REGISTERED"
        title={`Registered${registerCount ? ` (${registerCount})` : ''}`}
      />

      <DeviceListButtonEntity
        type="UNREGISTERED"
        title={`Unregistered${unregisterCount ? ` (${unregisterCount})` : ''}`}
      />
    </div>
  );
}

function DeviceListButtonEntity({ type, title }: { type: IListType; title: string }) {
  const { activeState, setState } = usePersistentTab();
  const isActive =
    ((activeState.edge_device as IListType | undefined) && activeState.edge_device === type) ||
    (type === 'REGISTERED' && !activeState.edge_device);

  return (
    <Button
      asChild
      className={cn(
        'flex flex-row items-center justify-center gap-4 rounded-md px-3 py-2.5 font-medium shadow-none hover:cursor-pointer',
        isActive ? 'bg-teal-800 text-white' : 'bg-transparent text-teal-800 hover:bg-teal-800/20'
      )}
      onClick={isActive ? () => {} : () => setState('edge_device', type)}
    >
      <Text type="btn">{title}</Text>
    </Button>
  );
}
