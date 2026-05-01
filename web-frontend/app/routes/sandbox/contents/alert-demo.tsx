import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function AlertDemo() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <h2 className="font-bold text-xl">Alert</h2>

      <div className="flex flex-col gap-4">
        <Alert>
          <AlertTitle>Default Alert</AlertTitle>
          <AlertDescription>This is a default alert description.</AlertDescription>
        </Alert>

        <Alert variant="destructive">
          <AlertTitle>Destructive Alert</AlertTitle>
          <AlertDescription>This is a destructive alert description.</AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
