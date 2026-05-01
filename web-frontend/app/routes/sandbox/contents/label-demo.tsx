import { Label } from '@/components/ui/label';

export function LabelDemo() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <h2 className="font-bold text-xl">Label</h2>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="terms"
          className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
        <Label htmlFor="terms">Accept terms and conditions</Label>
      </div>
    </div>
  );
}
