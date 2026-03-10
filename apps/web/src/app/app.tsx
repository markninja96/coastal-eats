import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { toast } from 'sonner';
import { useAuth } from './lib/auth';

type NavItem = {
  to: string;
  label: string;
};

const PROTECTED_NAV: NavItem[] = [
  { to: '/', label: 'Overview' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/swaps', label: 'Swaps' },
  { to: '/compliance', label: 'Compliance' },
  { to: '/fairness', label: 'Fairness' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/audit', label: 'Audit' },
];

const ADMIN_NAV: NavItem[] = [{ to: '/admin', label: 'Admin' }];

const PUBLIC_NAV: NavItem[] = [{ to: '/components', label: 'Components' }];

export function AppLayout() {
  const { session, status, logout } = useAuth();
  const navigate = useNavigate();
  const location = useRouterState({
    select: (state) => state.location,
  });
  const pathname = location.pathname;
  const isLoading = status === 'loading';
  const signedInName = session?.user?.name ?? session?.user?.email;
  const protectedRoutes = [
    ...PROTECTED_NAV.map((item) => item.to),
    ...ADMIN_NAV.map((item) => item.to),
  ];
  const isProtectedRoute = protectedRoutes.some((route) =>
    // Prefix match so protected base paths cover nested routes.
    route === '/'
      ? pathname === '/'
      : pathname === route || pathname.startsWith(`${route}/`),
  );
  const initials = signedInName
    ? signedInName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
    : null;

  return (
    <div className="min-h-screen bg-sky-700 text-ink">
      <header className="border-b border-white/15 bg-sand/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-coral text-white grid place-items-center font-semibold">
              CE
            </div>
            <div>
              <p className="font-display text-lg leading-none">ShiftSync</p>
              <p className="text-xs text-ink/60">Coastal Eats</p>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-ink/80 sm:gap-4">
            {[
              ...(session ? PROTECTED_NAV : []),
              ...(session?.user?.role === 'admin' ? ADMIN_NAV : []),
              ...PUBLIC_NAV,
            ].map((item) => {
              const isActive = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-3 py-1.5 transition ${
                    isActive
                      ? 'bg-white/20 text-white shadow-soft'
                      : 'text-ink/80 hover:bg-white/15'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
            {session ? (
              <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                {session.user ? (
                  <>
                    <span className="flex items-center gap-2 text-xs text-ink/70">
                      <span className="rounded-full border border-white/30 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]">
                        {session.user.role}
                      </span>
                      <span className="font-semibold text-ink">
                        {session.user.name}
                      </span>
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-white/10 text-[10px] font-semibold text-white">
                      {initials ?? 'CE'}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-ink/70">Signed in</span>
                )}
                {isLoading ? (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-ink/40">
                    Syncing
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await logout();
                      navigate({ to: '/login' });
                    } catch (error) {
                      const message =
                        error instanceof Error
                          ? error.message
                          : 'Unable to sign out. Please try again.';
                      toast.error(message);
                    }
                  }}
                  className="rounded-full border border-white/30 px-2 py-0.5 text-xs text-ink/70 hover:border-white/60"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        {isProtectedRoute && isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-8 text-sm text-ink/70">
              Checking session...
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
