import { X } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

import { cn } from '@/lib/utils';

import { Text } from '../helper/text';

type ToastType = 'success' | 'warning' | 'error';

interface ToastProps {
  id: string | number;
  title?: string;
  type: ToastType;
  duration?: number;
}

const DEFAULT_DURATIONS = {
  success: 3000,
  warning: 5000,
  error: 6000,
} satisfies Record<ToastType, number>;

function createToast({ title = '', type, duration }: Omit<ToastProps, 'id'>) {
  const toastDuration = duration ?? DEFAULT_DURATIONS[type];

  return sonnerToast.custom(
    (id) => <Toast id={id} type={type} title={title} duration={toastDuration} />,
    { duration: toastDuration }
  );
}

export const toast = {
  success: (title?: string, duration?: number) => createToast({ title, type: 'success', duration }),
  warning: (title?: string, duration?: number) => createToast({ title, type: 'warning', duration }),
  error: (title?: string, duration?: number) => createToast({ title, type: 'error', duration }),
};

function Toast(props: ToastProps) {
  const { title, type, id, duration } = props;
  return (
    <div className="relative flex w-full justify-between gap-x-4 overflow-hidden rounded-md bg-background p-5 shadow-lg sm:w-97 sm:gap-x-6 sm:p-6">
      <div className="flex flex-col gap-y-1">
        <Text type="btn" weight="semibold" className="max-sm:hidden">
          {type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Success'}!
        </Text>
        <Text type="btn" lineHeight={5}>
          {title}
        </Text>
      </div>
      <button type="button" className="border-l p-1 pl-5" onClick={() => sonnerToast.dismiss(id)}>
        <X className="size-4 text-primary" />
      </button>
      <div
        className={cn(
          'absolute bottom-0 left-0 h-1 w-full origin-left',
          type === 'error' ? 'bg-destructive' : type === 'warning' ? 'bg-amber-400' : 'bg-teal-500'
        )}
        style={{
          animation: `shrink ${duration}ms linear forwards`,
        }}
      />
      <style>{`
        @keyframes shrink {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
      `}</style>
    </div>
  );
}