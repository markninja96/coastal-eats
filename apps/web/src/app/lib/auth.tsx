import { useQuery, useQueryClient } from '@tanstack/react-query';
import { create, type StateCreator } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ApiError, apiFetch } from './api';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'staff';
  homeTimezone: string;
};

export type AuthSession = {
  accessToken: string;
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

const STORAGE_KEY = 'coastal-eats.auth';

const authStoreCreator: StateCreator<AuthStore, [], []> = (set, get) => ({
  session: null,
  loginPending: false,
  registerPending: false,
  loginError: null,
  registerError: null,
  setSession: (session: AuthSession | null) => set({ session }),
  setUser: (user: AuthUser | null) => {
    const current = get().session;
    if (!current) return;
    set({ session: { ...current, user } });
  },
  loginWithEmail: async (email: string, password: string) => {
    set({ loginPending: true, loginError: null });
    try {
      const data = await apiFetch<AuthSession>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      set({ session: data, loginPending: false });
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
      const data = await apiFetch<AuthSession>('/api/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });
      set({ session: data, registerPending: false });
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

const useAuthStore = create<AuthStore>()(
  persist(authStoreCreator, {
    name: STORAGE_KEY,
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      session: state.session
        ? { user: state.session.user, accessToken: '' }
        : null,
    }),
  }),
);

function useAuthBootstrap() {
  const session = useAuthStore((state) => state.session);
  const setUser = useAuthStore((state) => state.setUser);
  const setSession = useAuthStore((state) => state.setSession);
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: ['auth', 'me', accessToken],
    queryFn: async () => {
      try {
        const user = await apiFetch<AuthUser>('/api/auth/me', {
          token: accessToken ?? undefined,
        });
        if (!user) {
          throw new Error('Empty auth response');
        }
        setUser(user as AuthUser);
        return user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setSession(null);
        }
        throw error;
      }
    },
    enabled: Boolean(accessToken),
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

  const status: AuthContextValue['status'] = !session?.accessToken
    ? 'idle'
    : bootstrap.isFetching || loginPending || registerPending
      ? 'loading'
      : 'ready';

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
      logoutStore();
      queryClient.removeQueries({ queryKey: ['auth'] });
    },
  };
}
