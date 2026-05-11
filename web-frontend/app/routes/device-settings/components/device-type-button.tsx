import { cn } from '@/lib/utils';

import { Text } from '@/components/helper/text';

type IListType = 'REGISTERED' | 'UNREGISTERED';

export function DeviceListTypeButton({
  listType = 'REGISTERED',
  listCount,
}: {
  listType?: IListType;
  listCount?: number;
}) {
  return (
    <div className="flex flex-row rounded-md bg-white px-3 py-2 shadow-black-50 shadow-xl">
      <DeviceListButtonEntity
        isActive={listType === 'REGISTERED'}
        title={`Registered${listCount ? ` (${listCount})` : ''}`}
      />

      <DeviceListButtonEntity
        isActive={listType === 'UNREGISTERED'}
        title={`Unregistered${listCount ? ` (${listCount})` : ''}`}
      />
    </div>
  );
}

function DeviceListButtonEntity({ isActive, title }: { isActive: boolean; title: string }) {
  return (
    <div
      className={cn(
        'flex flex-row items-center justify-center gap-4 rounded-md px-3 py-2.5 font-medium hover:cursor-pointer',
        isActive ? 'bg-teal-800 text-white' : 'bg-none text-teal-800 hover:bg-teal-800/20'
      )}
    >
      <Text type="btn">{title}</Text>
    </div>
  );
}
