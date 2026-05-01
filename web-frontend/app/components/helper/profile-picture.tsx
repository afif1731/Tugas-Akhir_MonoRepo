import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { User } from 'lucide-react';

import { BASE_URL } from '@/lib/axios';
import { cn } from '@/lib/utils';

export function ProfilePicture({
  src = '?',
  fallback,
  className,
  iconSize = 'size-4',
}: {
  src?: string | null;
  fallback?: string;
  className?: string;
  iconSize?: string;
}) {
  return src ? (
    <Avatar className={cn('shrink-0 overflow-hidden rounded-full bg-secondary', className)}>
      <AvatarImage src={`${BASE_URL}/${src}`} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  ) : (
    <Avatar
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-secondary',
        className
      )}
    >
      <AvatarFallback>
        <User className={iconSize} />
      </AvatarFallback>
    </Avatar>
  );
}
