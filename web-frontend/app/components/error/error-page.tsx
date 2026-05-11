import { HomeIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Text } from '../helper/text';
import { Button } from '../ui/button';

type ErrorPageProps = {
  descTitle: string | ReactNode;
  descSub?: string | ReactNode;
  statusCode: number;
};

export default function ErrorPage({ descTitle, statusCode, descSub }: ErrorPageProps) {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-slate-100 px-8 py-8">
      <div className="flex flex-col items-center justify-center gap-4 lg:items-start lg:justify-start">
        <Text type="h1" className="font-black text-red-600">
          Error {statusCode}
        </Text>

        <Text type="h3" className="font-semibold text-moca-darker">
          {descTitle}
        </Text>

        {descSub && (
          <Text type="p" className="font-medium text-moca-base">
            {descSub}
          </Text>
        )}

        <Button asChild leftIcon={<HomeIcon className="mb-0.5" />} variant="default">
          <Link to="/" replace>
            Back to Home
          </Link>
        </Button>
      </div>
    </main>
  );
}
