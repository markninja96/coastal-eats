import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { create, type StateCreator } from 'zustand';
import { ApiError, apiFetch } from './api';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'staff';
  homeTimezone: string;
};

export type AuthSession = {
  user: AuthUser | null;
};

export type AuthContextValue = {
  session: AuthSession | null;
  status: 'idle' | 'loading' | 'ready' | 'failed';
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  loginPending: boolean;
  registerPending: boolean;
  loginError: Error | null;
  registerError: Error | null;
  logout: () => Promise<void>;
};

type AuthStore = {
  session: AuthSession | null;
  loginPending: boolean;
  registerPending: boolean;
  loginError: Error | null;
  registerError: Error | null;
  setSession: (session: AuthSession | null) => void;
  setUser: (user: AuthUser | null) => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  clearSession: () => void;
};

const authStoreCreator: StateCreator<AuthStore, [], []> = (set, get) => ({
  session: null,
  loginPending: false,
  registerPending: false,
  loginError: null,
  registerError: null,
  setSession: (session: AuthSession | null) => set({ session }),
  setUser: (user: AuthUser | null) => {
    if (!user) {
      set({ session: null });
      return;
    }
    const current = get().session;
    if (!current) {
      set({ session: { user } });
      return;
    }
    set({ session: { ...current, user } });
  },
  loginWithEmail: async (email: string, password: string) => {
    set({ loginPending: true, loginError: null });
    try {
      const data = await apiFetch<{ user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (!data?.user) {
        throw new Error('Empty auth response');
      }
      set({ session: { user: data.user }, loginPending: false });
    } catch (error) {
      const nextError =
        error instanceof ApiError || error instanceof Error
          ? error
          : new Error(String(error));
      set({
        loginPending: false,
        loginError: nextError,
      });
      throw error;
    }
  },
  registerWithEmail: async (name: string, email: string, password: string) => {
    set({ registerPending: true, registerError: null });
    try {
      const data = await apiFetch<{ user: AuthUser }>('/api/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });
      if (!data?.user) {
        throw new Error('Empty auth response');
      }
      set({ session: { user: data.user }, registerPending: false });
    } catch (error) {
      const nextError =
        error instanceof ApiError || error instanceof Error
          ? error
          : new Error(String(error));
      set({
        registerPending: false,
        registerError: nextError,
      });
      throw error;
    }
  },
  clearSession: () =>
    set({
      session: null,
      loginPending: false,
      registerPending: false,
      loginError: null,
      registerError: null,
    }),
});

const useAuthStore = create<AuthStore>()(authStoreCreator);

export const getAuthQueryOptions = (queryClient: QueryClient) => ({
  queryKey: ['auth', 'me'],
  queryFn: async () => {
    const sessionSnapshot = useAuthStore.getState().session;
    try {
      const user = await apiFetch<AuthUser>('/api/auth/me', {
        method: 'GET',
      });
      if (!user) {
        throw new Error('Empty auth response');
      }
      if (useAuthStore.getState().session !== sessionSnapshot) {
        return null;
      }
      useAuthStore.getState().setUser(user as AuthUser);
      return user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        if (useAuthStore.getState().session === sessionSnapshot) {
          useAuthStore.getState().setSession(null);
          ['locations', 'skills', 'staff', 'shifts', 'shift-staff'].forEach(
            (key) => {
              queryClient.removeQueries({ queryKey: [key] });
            },
          );
        }
        return null;
      }
      throw error;
    }
  },
  staleTime: 60_000,
  retry: 1,
});

function useAuthBootstrap() {
  const queryClient = useQueryClient();
  return useQuery(getAuthQueryOptions(queryClient));
}

export function useAuth(): AuthContextValue {
  const session = useAuthStore((state) => state.session);
  const loginWithEmail = useAuthStore((state) => state.loginWithEmail);
  const registerWithEmail = useAuthStore((state) => state.registerWithEmail);
  const loginPending = useAuthStore((state) => state.loginPending);
  const registerPending = useAuthStore((state) => state.registerPending);
  const loginError = useAuthStore((state) => state.loginError);
  const registerError = useAuthStore((state) => state.registerError);
  const clearSession = useAuthStore((state) => state.clearSession);
  const bootstrap = useAuthBootstrap();
  const queryClient = useQueryClient();

  const status: AuthContextValue['status'] = bootstrap.isPending
    ? 'loading'
    : bootstrap.isError
      ? 'failed'
      : loginPending || registerPending
        ? 'loading'
        : session?.user
          ? 'ready'
          : 'idle';

  return {
    session,
    status,
    loginWithEmail,
    registerWithEmail,
    loginPending,
    registerPending,
    loginError,
    registerError,
    logout: async () => {
      let errorMessage: string | null = null;
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      } finally {
        clearSession();
        [
          'auth',
          'locations',
          'skills',
          'staff',
          'shifts',
          'shift-staff',
        ].forEach((key) => {
          queryClient.removeQueries({ queryKey: [key] });
        });
      }
      if (errorMessage) {
        throw new Error(`Logout failed: ${errorMessage}`);
      }
    },
  };
}
