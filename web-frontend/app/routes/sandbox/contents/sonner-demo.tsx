import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

export function SonnerDemo() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <h2 className="font-bold text-xl">Sonner</h2>
      <div>
        <Button
          variant="outline"
          onClick={() =>
            toast('Event has been created', {
              description: 'Sunday, December 03, 2023 at 9:00 AM',
              action: {
                label: 'Undo',
                onClick: () => console.log('Undo'),
              },
            })
          }
        >
          Show Toast
        </Button>
      </div>
    </div>
  );
}
