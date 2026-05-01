import { cn } from '@/lib/utils';

import Image from '../helper/image';

export function WebNameLogo({ size = 'regular' }: { size?: 'regular' | 'small' }) {
  return (
    <div className={cn('flex flex-row items-center gap-2 pb-2')}>
      <Image
        src="/images/logo/moca-vision-logo.png"
        alt="Web Logo"
        className={cn(
          'w-auto rounded-3xl shadow-2xs shadow-white',
          size === 'regular' ? 'h-10 md:h-12' : 'h-6'
        )}
      />

      <div className={cn('flex flex-row gap-0')}>
        <span
          className={cn(
            'italic tracking-tighter',
            'font-racing-sans text-shadow-2xs text-shadow-white text-teal-500',
            size === 'regular' ? 'text-3xl md:text-5xl' : 'text-2xl'
          )}
        >
          COM
        </span>
        {/* <span
          className={cn(
            'italic tracking-tighter',
            'font-racing-sans text-red-400 text-shadow-2xs text-shadow-white',
            size === 'regular' ? 'text-3xl md:text-5xl' : 'text-2xl'
          )}
        >
          A
        </span> */}
        <span
          className={cn(
            'font-racing-sans text-shadow-2xs text-shadow-white text-teal-700',
            size === 'regular' ? 'text-3xl md:text-5xl' : 'text-2xl'
          )}
        >
          &nbsp;- Vision
        </span>
      </div>
    </div>
  );
}
