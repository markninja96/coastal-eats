import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { AppLayout } from './app';
import { ComponentsRoute } from './routes/components';
import { HomeRoute } from './routes/home';
import { ScheduleRoute } from './routes/schedule';
import { SwapsRoute } from './routes/swaps';
import { ComplianceRoute } from './routes/compliance';
import { FairnessRoute } from './routes/fairness';

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

const scheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/schedule',
  component: ScheduleRoute,
});

const swapsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/swaps',
  component: SwapsRoute,
});

const complianceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/compliance',
  component: ComplianceRoute,
});

const fairnessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fairness',
  component: FairnessRoute,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  componentsRoute,
  scheduleRoute,
  swapsRoute,
  complianceRoute,
  fairnessRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
