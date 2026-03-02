import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';
import { AppLayout } from './app';
import { ComponentsRoute } from './routes/components';
import { HomeRoute } from './routes/home';
import { ScheduleRoute } from './routes/schedule';
import { SwapsRoute } from './routes/swaps';
import { ComplianceRoute } from './routes/compliance';
import { FairnessRoute } from './routes/fairness';
import { NotificationsRoute } from './routes/notifications';
import { AuditRoute } from './routes/audit';
import { LoginRoute } from './routes/login';
import type { AuthContextValue } from './lib/auth';

type RouterContext = {
  auth: Pick<AuthContextValue, 'session' | 'status'>;
};

const requireAuth = ({
  context,
  location,
}: {
  context: RouterContext;
  location: { pathname: string; search: Record<string, string> };
}) => {
  if (!context.auth.session?.accessToken) {
    const search = new URLSearchParams(location.search).toString();
    throw redirect({
      to: '/login',
      search: { redirect: `${location.pathname}${search ? `?${search}` : ''}` },
    });
  }
};

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: AppLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomeRoute,
  beforeLoad: requireAuth,
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
  beforeLoad: requireAuth,
});

const swapsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/swaps',
  component: SwapsRoute,
  beforeLoad: requireAuth,
});

const complianceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/compliance',
  component: ComplianceRoute,
  beforeLoad: requireAuth,
});

const fairnessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fairness',
  component: FairnessRoute,
  beforeLoad: requireAuth,
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notifications',
  component: NotificationsRoute,
  beforeLoad: requireAuth,
});

const auditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/audit',
  component: AuditRoute,
  beforeLoad: requireAuth,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginRoute,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  componentsRoute,
  scheduleRoute,
  swapsRoute,
  complianceRoute,
  fairnessRoute,
  notificationsRoute,
  auditRoute,
  loginRoute,
]);

export const router = createRouter({
  routeTree,
  context: { auth: { session: null, status: 'idle' } },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
