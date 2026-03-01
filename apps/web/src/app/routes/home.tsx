import { CalendarDays, ClipboardList, Users } from 'lucide-react';

const stats = [
  {
    title: 'Shifts this week',
    value: '128',
    detail: '8 locations covered',
    icon: CalendarDays,
  },
  {
    title: 'Pending requests',
    value: '6',
    detail: '2 swaps need approval',
    icon: ClipboardList,
  },
  {
    title: 'On duty now',
    value: '22',
    detail: 'Across 4 locations',
    icon: Users,
  },
];

export function HomeRoute() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-3xl border border-white/15 bg-mist/90 p-8 shadow-soft">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-ink/40">
            ShiftSync
          </p>
          <h1 className="font-display text-3xl text-ink md:text-4xl">
            Multi-location scheduling built for Coastal Eats.
          </h1>
          <p className="max-w-2xl text-base text-ink/70">
            Keep coverage fair, prevent overtime surprises, and coordinate swaps
            across time zones with confidence.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white">
            Create schedule
          </button>
          <button className="rounded-full border border-white/30 bg-sand/40 px-5 py-2 text-sm font-semibold text-white hover:bg-sand/60">
            Review swap requests
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-2xl border border-white/15 bg-mist/90 p-6 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink/60">{item.title}</p>
                <span className="rounded-full bg-sand/70 px-2 py-1 text-ink/70">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-ink">
                {item.value}
              </p>
              <p className="text-sm text-ink/60">{item.detail}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-white/15 bg-mist/90 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-ink/40">
                Coverage risk
              </p>
              <h2 className="font-display text-2xl">Sunday night hotspots</h2>
            </div>
            <button className="rounded-full border border-white/30 bg-sand/40 px-4 py-2 text-sm text-white hover:bg-sand/60">
              View shifts
            </button>
          </div>
          <div className="mt-6 grid gap-4">
            {['Seattle waterfront', 'Portland Pearl', 'Miami Beach'].map(
              (site) => (
                <div
                  key={site}
                  className="flex items-center justify-between rounded-2xl bg-sand/70 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{site}</p>
                    <p className="text-xs text-ink/60">1 bartender short</p>
                  </div>
                  <span className="text-xs font-semibold text-coral">
                    High risk
                  </span>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/15 bg-mist/90 p-6 shadow-soft">
          <p className="text-sm uppercase tracking-[0.2em] text-ink/40">
            Overtime watch
          </p>
          <h2 className="mt-2 font-display text-2xl">
            Projected overtime costs
          </h2>
          <p className="mt-3 text-sm text-ink/60">
            Three staff are projected above 35 hours if Friday shifts are
            confirmed.
          </p>
          <div className="mt-6 space-y-3">
            {['Sarah Chen', 'John Rivera', 'Maria Santos'].map((name) => (
              <div
                key={name}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-ink">{name}</span>
                <span className="rounded-full bg-sand/70 px-2 py-1 text-ink/70">
                  +4 hrs
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
