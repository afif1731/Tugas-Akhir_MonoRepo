import { Suspense, useState } from 'react';
import { Outlet, ScrollRestoration, useOutletContext } from 'react-router';

import { useIsMobile } from '@/hooks/use-mobile';
import { api } from '@/lib/axios';
import { itemStorage } from '@/lib/storage';
import { revalidatePathChanges } from '@/lib/utils';

import Loading from '@/components/helper/loading';
import LogoutDialog from '@/components/shared/logout-dialog';
import { SidebarComponent } from '@/components/ui/sidebar';

import type { IUser } from '@/schemas/models';

import type { Route } from './+types/public-layout';

export const shouldRevalidate = revalidatePathChanges;

export async function clientLoader() {
  try {
    const response = await api.get<IUser>('/auth/me');

    itemStorage.local.set('user-data', response.data);

    return { user: response.data };
  } catch (_) {
    return { user: undefined };
  }
}

export default function PublicLayout({ loaderData }: Route.ComponentProps) {
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
        <Outlet context={{ user: loaderData.user } satisfies { user: IUser | undefined }} />
      </main>
      <LogoutDialog />
    </Suspense>
  );
}

export function usePublicLayoutCtx() {
  return useOutletContext<{ user: IUser | undefined }>();
}
