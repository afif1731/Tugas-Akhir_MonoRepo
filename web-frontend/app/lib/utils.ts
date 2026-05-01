/** biome-ignore-all lint/suspicious/noExplicitAny: _ */
/** biome-ignore-all lint/style/noNonNullAssertion: _ */
import { type ClassValue, clsx } from 'clsx';
import type { ShouldRevalidateFunctionArgs } from 'react-router';
import { twMerge } from 'tailwind-merge';

import { toast } from '@/components/ui/toast';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function handleApiResponseError(
  error: any,
  { withToast = true, returnMessage = false }: { withToast?: boolean; returnMessage?: boolean } = {}
) {
  let errorMessage = 'Something has gone wrong! Please try again.';

  if (error?.response?.data?.message) {
    errorMessage = error.response.data.message;
  } else if (error?.data?.message) {
    errorMessage = error.data.message;
  } else if (error?.message) {
    errorMessage = error.message;
  }

  if (withToast) {
    toast.error(errorMessage);
  }

  if (returnMessage) {
    return errorMessage;
  }
}

export function revalidatePathChanges({
  currentUrl,
  nextUrl,
  actionResult,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (actionResult !== undefined) {
    if (actionResult.update_profile_success === true) {
      return true;
    }
  }
  return currentUrl.pathname !== nextUrl.pathname && defaultShouldRevalidate;
}
