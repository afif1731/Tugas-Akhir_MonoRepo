/** biome-ignore-all lint/suspicious/noExplicitAny: _ */

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useRevalidator } from 'react-router';

import useDialogStore from '@/hooks/store/use-dialog';
import { api } from '@/lib/axios';
import { itemStorage } from '@/lib/storage';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/toast';

export default function LogoutDialog() {
  const { isOpen, close } = useDialogStore();
  const [isLoading, setIsLoading] = useState(false);
  const revalidator = useRevalidator();

  async function handleLogout() {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/logout');
      itemStorage.local.remove('user-data');

      revalidator.revalidate();

      setTimeout(() => {
        toast.success(response.message);
        close('logout');
        setIsLoading(false);
        setTimeout(() => {
          window.location.href = '/';
        }, 150);
      }, 250);
    } catch (error: any) {
      setIsLoading(false);
      const errorMessage = error?.response?.data?.message || error?.message;
      toast.error(errorMessage);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open && !isLoading) {
      close('logout');
    }
  }

  return (
    <AlertDialog open={isOpen.logout} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Logging Out</AlertDialogTitle>
          <AlertDialogDescription>You will be logged out from your account.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-red-700 disabled:opacity-50"
            disabled={isLoading}
            onClick={(e) => {
              e.preventDefault();
              handleLogout();
            }}
          >
            {isLoading && <Loader2 className="mb-0.5 size-4 animate-spin" />}
            Logout
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
