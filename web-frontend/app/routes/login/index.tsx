import { redirect } from 'react-router';
import { parseFormData } from 'remix-hook-form';

import { api } from '@/lib/axios';
import { itemStorage } from '@/lib/storage';
import { cn, handleApiResponseError } from '@/lib/utils';

import { Text } from '@/components/helper/text';
import { WebNameLogo } from '@/components/logo/web-name';
import { toast } from '@/components/ui/toast';

import type { IUser } from '@/schemas/models/user';

import type { Route } from './+types';
import { LoginForm } from './components/login-form';

export async function clientAction({ request }: Route.ClientActionArgs) {
  try {
    const data = await parseFormData(request);
    await api.post('/auth/login', data);
    const response = await api.get<IUser>('/auth/me');

    itemStorage.local.set('user-data', response.data);
    toast.success('Login Successfully');

    return redirect('/');
  } catch (error) {
    handleApiResponseError(error);
  }
}

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Login | Moca-Vision' }];
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-linear-to-t from-teal-100 to-red-100 px-6 py-12 lg:px-8">
      <div
        className={cn(
          'sm:mx-auto sm:w-full sm:max-w-md md:gap-8 md:px-8 md:py-9',
          'flex flex-col items-center gap-6 rounded-2xl px-6 py-7',
          'bg-white shadow-2xl shadow-black/50'
        )}
      >
        <div
          className={cn(
            'md:min-w-96',
            'min-w-72',
            'flex flex-row items-center justify-center border-teal-500 border-b-2 pb-3'
          )}
        >
          <WebNameLogo />
        </div>
        <Text type={'h6'} className={cn('font-semibold text-teal-800')}>
          SIGN IN
        </Text>
        <LoginForm />
      </div>
    </div>
  );
}
