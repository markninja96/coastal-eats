import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  status: 'idle' | 'loading' | 'ready';
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
  logout: () => void;
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
  logout: () => void;
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
      set({
        registerPending: false,
        registerError: error as Error,
      });
      throw error;
    }
  },
  logout: () =>
    set({
      session: null,
      loginPending: false,
      registerPending: false,
      loginError: null,
      registerError: null,
    }),
});

const useAuthStore = create<AuthStore>()(authStoreCreator);

function useAuthBootstrap() {
  const setUser = useAuthStore((state) => state.setUser);
  const setSession = useAuthStore((state) => state.setSession);

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const user = await apiFetch<AuthUser>('/api/auth/me', {
          method: 'GET',
        });
        if (!user) {
          throw new Error('Empty auth response');
        }
        setUser(user as AuthUser);
        return user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setSession(null);
          return null;
        }
        throw error;
      }
    },
    staleTime: 60_000,
    retry: 1,
  });
}

export function useAuth(): AuthContextValue {
  const session = useAuthStore((state) => state.session);
  const loginWithEmail = useAuthStore((state) => state.loginWithEmail);
  const registerWithEmail = useAuthStore((state) => state.registerWithEmail);
  const loginPending = useAuthStore((state) => state.loginPending);
  const registerPending = useAuthStore((state) => state.registerPending);
  const loginError = useAuthStore((state) => state.loginError);
  const registerError = useAuthStore((state) => state.registerError);
  const logoutStore = useAuthStore((state) => state.logout);
  const bootstrap = useAuthBootstrap();
  const queryClient = useQueryClient();

  const status: AuthContextValue['status'] =
    bootstrap.isFetching || loginPending || registerPending
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
    logout: () => {
      void apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
      logoutStore();
      queryClient.removeQueries({ queryKey: ['auth'] });
    },
  };
}
