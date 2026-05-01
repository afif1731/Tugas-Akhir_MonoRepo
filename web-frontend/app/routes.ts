import { index, layout, type RouteConfig, route } from '@react-router/dev/routes';

export default [
  route('sandbox', 'routes/sandbox/index.tsx'),
  route('login', 'routes/login/index.tsx'),

  layout('routes/layouts/public-layout.tsx', [
    index('routes/home/index.tsx'),
    route('home', 'routes/home/home-redirect.tsx'),
  ]),
] satisfies RouteConfig;
