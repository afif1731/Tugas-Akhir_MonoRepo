import { LoaderCircle } from 'lucide-react';

import { Text } from './text';

export default function Loading() {
  return (
    <main className="flex h-screen flex-col items-center justify-center space-y-5 bg-slate-100">
      <Text className="text-center text-teal-950">Please Wait...</Text>
      <LoaderCircle size={36} className="animate-spin text-teal-950" />
    </main>
  );
}
