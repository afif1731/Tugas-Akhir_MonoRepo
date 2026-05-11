import { type ReactNode, useMemo } from 'react';
import { isRouteErrorResponse } from 'react-router';

import type { Route } from '../../+types/root';
import ErrorPage from './error-page';

type ERROR_DESC_MAP_PROPS = {
  [key: number]: {
    title: string;
    sub: string | ReactNode;
  };
};

const ERROR_DESC_MAP: ERROR_DESC_MAP_PROPS = {
  403: {
    title: 'Forbidden',
    sub: "You're not allowed to access this page!",
  },
  404: {
    title: 'Page not Found!',
    sub: 'This content might be missing or simply never ceast to exist.',
  },
  500: {
    title: 'Internal Server Error',
    sub: 'Something possibly wrong with the server.',
  },
};

function extractStatusCode(error: number) {
  if (isRouteErrorResponse(error) && typeof error.status === 'number') {
    return error.status;
  }
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as Record<string, unknown>).status === 'number'
  ) {
    return (error as Record<string, unknown>).status;
  }
  return 500;
}

export default function ErrorBoundaryComponent(props: Route.ErrorBoundaryProps) {
  const { error } = props;
  const { descTitle, descSub, statusCode } = useMemo(() => {
    const statusCode = extractStatusCode(error as number);
    const desc = ERROR_DESC_MAP[statusCode as keyof typeof ERROR_DESC_MAP] || {
      title:
        (isRouteErrorResponse(error) && error.statusText) ||
        (error instanceof Error && error.message) ||
        'Error',
      sub:
        (isRouteErrorResponse(error) && error.data) ||
        (typeof error === 'object' && error !== null && 'message' in error
          ? (error as Record<string, unknown>).message
          : '') ||
        '',
    };
    return {
      descTitle: desc.title,
      descSub: desc.sub,
      statusCode,
    };
  }, [error]);

  return (
    <>
      <title>{descTitle}</title>
      <meta name="description" content="Something went very wrong!" />
      <ErrorPage descTitle={descTitle} descSub={descSub} statusCode={statusCode as number} />
    </>
  );
}
