import { ArrowLeftIcon } from 'lucide-react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

import { Text } from '../helper/text';
import { Button } from '../ui/button';

export default function TitleSection({
  title,
  description,
  className,
  backTo,
  backAction,
}: {
  title: string;
  description?: string;
  className?: string;
  backTo?: string;
  backAction?: () => void;
}) {
  return (
    <div className={cn('flex items-center gap-x-3 pb-3', className)}>
      {backTo && (
        <Button
          asChild
          variant="outline"
          colors="teal-800"
          size="icon"
          onClick={backAction}
          className="bg-white"
        >
          <Link to={backTo}>
            <ArrowLeftIcon size={28} className="stroke-3" />
          </Link>
        </Button>
      )}

      <div className="flex flex-col gap-y-3 text-start">
        <Text type="t" className="font-semibold text-red-600">
          {title}
        </Text>

        {description && (
          <Text type="p" className="font-medium text-moca-base">
            {description}
          </Text>
        )}
      </div>
    </div>
  );
}
