import { valibotResolver } from '@hookform/resolvers/valibot';
import { LogInIcon } from 'lucide-react';
import { Form } from 'react-router';
import { RemixFormProvider, useRemixForm } from 'remix-hook-form';

import InputForm from '@/components/form/input';
import { Button } from '@/components/ui/button';

import { LoginSchema } from '@/schemas/models';

export function LoginForm() {
  const methods = useRemixForm({
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
    },
    resolver: valibotResolver(LoginSchema),
  });

  const {
    formState: { isSubmitting },
    handleSubmit,
  } = methods;

  return (
    <RemixFormProvider {...methods}>
      <Form onSubmit={handleSubmit} className="w-full space-y-6" method="post">
        <InputForm name="email" type="text" placeholder="Email" isRequired />
        <InputForm name="password" type="password" placeholder="Password" isRequired />
        <Button
          type="submit"
          className="mb-1 w-full"
          leftIcon={<LogInIcon className="stroke-3" />}
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          Login
        </Button>
      </Form>
    </RemixFormProvider>
  );
}
