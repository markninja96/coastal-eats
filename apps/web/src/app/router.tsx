import { createRouter } from '@tanstack/react-router';
import { queryClient } from './query-client';
import { routeTree } from './routeTree.gen';

export const router = createRouter({
  routeTree,
  context: { auth: { session: null, status: 'idle' }, queryClient },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
