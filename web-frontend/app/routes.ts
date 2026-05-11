import { index, layout, type RouteConfig, route } from '@react-router/dev/routes';

export default [
  route('sandbox', 'routes/sandbox/index.tsx'),
  route('login', 'routes/login/index.tsx'),

  layout('routes/layouts/public-layout.tsx', [
    index('routes/home/index.tsx'),
    route('home', 'routes/home/home-redirect.tsx'),
  ]),

  layout('routes/layouts/private-layout.tsx', [
    route('device-settings', 'routes/device-settings/index.tsx'),
  ]),

  layout('routes/layouts/authenticated-layout.tsx', [route('profile', 'routes/profile/index.tsx')]),

  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
