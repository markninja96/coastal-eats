import { Link, Outlet } from '@tanstack/react-router';

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
          <nav className="flex items-center gap-4 text-sm text-ink/80">
            <Link to="/" className="rounded-full px-3 py-1.5 hover:bg-white/15">
              Overview
            </Link>
            <Link
              to="/components"
              className="rounded-full px-3 py-1.5 hover:bg-white/15"
            >
              Components
            </Link>
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
