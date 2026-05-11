import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';

import type { Route } from './+types/root';
import 'react-photo-view/dist/react-photo-view.css';
import './styles/app.css';

import ErrorBoundaryComponent from './components/error/error-boundary-component';
import { Toaster } from './components/ui/sonner';
import { useLiveKitInit } from './hooks/store/use-livekit';

export const links: Route.LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.ico',
    type: 'image/x-icon',
  },
  {
    rel: 'preload',
    href: '/fonts/poppins/Poppins-Light.ttf',
    as: 'font',
    type: 'font/ttf',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'preload',
    href: '/fonts/poppins/Poppins-Medium.ttf',
    as: 'font',
    type: 'font/ttf',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'preload',
    href: '/fonts/poppins/Poppins-Bold.ttf',
    as: 'font',
    type: 'font/ttf',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'preload',
    href: '/fonts/racing-one/RacingSansOne-Regular.ttf',
    as: 'font',
    type: 'font/ttf',
    crossOrigin: 'anonymous',
  },
  { rel: 'preload', href: '/app/styles/app.css', as: 'style' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <Toaster position="top-center" visibleToasts={1} />
      </body>
    </html>
  );
}

export default function App() {
  useLiveKitInit();

  return <Outlet />;
}

export function ErrorBoundary(props: Route.ErrorBoundaryProps) {
  return <ErrorBoundaryComponent {...props} />;
}
