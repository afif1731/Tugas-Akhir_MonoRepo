import { PlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function ButtonDemo() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <h2 className="font-bold text-xl">Button Variants</h2>
      <div className="flex flex-wrap gap-4">
        <Button variant="default">Default</Button>
        <Button variant="default" color="destructive">
          Destructive
        </Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>

      <h2 className="mt-4 font-bold text-xl">Button Sizes</h2>
      <div className="flex flex-wrap items-center gap-4">
        <Button size="default">Default</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button size="icon">
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}
