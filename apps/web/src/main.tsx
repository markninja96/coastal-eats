import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Toaster } from 'sonner';
import { router } from './app/router';
import { useAuth } from './app/lib/auth';
import './styles.css';

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster theme="dark" richColors />
      {import.meta.env.DEV ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
      {import.meta.env.DEV ? (
        <TanStackRouterDevtools router={router} position="bottom-left" />
      ) : null}
    </QueryClientProvider>
  </StrictMode>,
);

function AppRouter() {
  const { session, status } = useAuth();
  return (
    <RouterProvider router={router} context={{ auth: { session, status } }} />
  );
}
