import Cookies from 'js-cookie';
import { Suspense, useState } from 'react';
import { Outlet, redirect, ScrollRestoration, useOutletContext } from 'react-router';

import { useIsMobile } from '@/hooks/use-mobile';
import { api } from '@/lib/axios';
import { itemStorage } from '@/lib/storage';
import { revalidatePathChanges } from '@/lib/utils';

import Loading from '@/components/helper/loading';
import LogoutDialog from '@/components/shared/logout-dialog';
import { SidebarComponent } from '@/components/ui/sidebar';

import type { IUser } from '@/schemas/models';

import type { Route } from './+types/authenticated-layout';

export const shouldRevalidate = revalidatePathChanges;

export async function clientLoader() {
  let user: IUser | undefined;

  try {
    const isLoggedIn = Cookies.get('login-flag') === 'true';
    const currentUser = itemStorage.session.get<IUser>('user-data');
    if (currentUser && isLoggedIn) user = currentUser;

    const response = await api.get<IUser>('/auth/me');

    itemStorage.session.set('user-data', response.data);

    user = response.data;
  } catch (_) {
    user = undefined;
  }

  if (!user) throw redirect('/login');

  return { user };
}

export default function AuthenticatedLayout({ loaderData }: Route.ComponentProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const isMobile = useIsMobile();

  return (
    <Suspense fallback={<Loading />}>
      <main className="overflow-hidden">
        <SidebarComponent
          user={loaderData?.user}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isMobile={isMobile}
        />
        <ScrollRestoration />
        <Outlet context={{ user: loaderData.user } satisfies { user: IUser }} />
      </main>
      <LogoutDialog />
    </Suspense>
  );
}

export function useAuthenticatedLayoutCtx() {
  return useOutletContext<{ user: IUser }>();
}
