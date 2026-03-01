import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { AppLayout } from './app';
import { ComponentsRoute } from './routes/components';
import { HomeRoute } from './routes/home';

const rootRoute = createRootRoute({
  component: AppLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomeRoute,
});

const componentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components',
  component: ComponentsRoute,
});

const routeTree = rootRoute.addChildren([indexRoute, componentsRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
