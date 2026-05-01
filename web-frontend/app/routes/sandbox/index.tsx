import { AccordionDemo } from './contents/accordion-demo';
import { AlertDemo } from './contents/alert-demo';
import { AlertDialogDemo } from './contents/alert-dialog-demo';
import { ButtonDemo } from './contents/button-demo';
import { DialogDemo } from './contents/dialog-demo';
import { FormDemo } from './contents/form-demo';
import { LabelDemo } from './contents/label-demo';
import { SonnerDemo } from './contents/sonner-demo';

export default function SandBoxPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-8 py-10">
      <h1 className="mb-8 font-bold text-3xl">UI Components Sandbox</h1>
      <AccordionDemo />
      <AlertDemo />
      <AlertDialogDemo />
      <ButtonDemo />
      <DialogDemo />
      <FormDemo />
      <LabelDemo />
      <SonnerDemo />
    </div>
  );
}
