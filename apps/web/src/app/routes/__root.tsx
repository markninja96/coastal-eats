import { createRootRouteWithContext, redirect } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type { AuthContextValue } from '../lib/auth';
import { getAuthQueryOptions } from '../lib/auth';
import { AppLayout } from '../app';

type RouterContext = {
  auth: Pick<AuthContextValue, 'session' | 'status'>;
  queryClient: QueryClient;
};

const PROTECTED_PATHS = [
  '/',
  '/schedule',
  '/swaps',
  '/compliance',
  '/fairness',
  '/notifications',
  '/audit',
  '/admin',
];

const isProtectedPath = (pathname: string) =>
  PROTECTED_PATHS.some((route) =>
    route === '/'
      ? pathname === '/'
      : pathname === route || pathname.startsWith(`${route}/`),
  );

const requireAuth = async ({
  context,
  location,
}: {
  context: RouterContext;
  location: {
    href: string;
    pathname: string;
  };
}) => {
  if (!isProtectedPath(location.pathname)) {
    return;
  }
  const user = await context.queryClient.fetchQuery({
    ...getAuthQueryOptions(context.queryClient),
    staleTime: 0,
  });
  if (!user) {
    throw redirect({
      to: '/login',
      search: { redirect: location.href },
    });
  }
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: AppLayout,
  beforeLoad: ({ context, location }) => requireAuth({ context, location }),
});
