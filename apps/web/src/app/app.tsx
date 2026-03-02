import { Link, Outlet } from '@tanstack/react-router';

const NAV_ITEMS = [
  { to: '/', label: 'Overview' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/swaps', label: 'Swaps' },
  { to: '/compliance', label: 'Compliance' },
  { to: '/fairness', label: 'Fairness' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/audit', label: 'Audit' },
  { to: '/components', label: 'Components' },
  { to: '/login', label: 'Login' },
] as const;

export function AppLayout() {
  return (
    <div className="min-h-screen bg-sky-700 text-ink">
      <header className="border-b border-white/15 bg-sand/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-coral text-white grid place-items-center font-semibold">
              CE
            </div>
            <div>
              <p className="font-display text-lg leading-none">ShiftSync</p>
              <p className="text-xs text-ink/60">Coastal Eats</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-ink/80 sm:gap-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full px-3 py-1.5 hover:bg-white/15"
              >
                {item.label}
              </Link>
            ))}
            <button className="rounded-full border border-white/30 bg-mist/60 px-3 py-1.5 text-white hover:border-white/50">
              Seattle
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
