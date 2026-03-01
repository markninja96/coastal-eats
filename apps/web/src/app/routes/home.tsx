import { CalendarDays, ClipboardList, Users } from 'lucide-react';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Card, CardBody, CardHeader } from '../components/card';
import { InlineAlert } from '../components/inline-alert';
import { PageHeader } from '../components/page-header';
import { StatCard } from '../components/stat-card';

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

const SITE_LIST = ['Seattle waterfront', 'Portland Pearl', 'Miami Beach'];
const OVERTIME_NAMES = ['Sarah Chen', 'John Rivera', 'Maria Santos'];

export function HomeRoute() {
  return (
    <div className="space-y-8">
      <Card className="p-8">
        <PageHeader
          eyebrow="ShiftSync"
          title="Multi-location scheduling built for Coastal Eats."
          subtitle="Keep coverage fair, prevent overtime surprises, and coordinate swaps across time zones with confidence."
          actions={
            <>
              <Button>Create schedule</Button>
              <Button variant="secondary">Review swap requests</Button>
            </>
          }
        />
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-ink/40">
                Coverage risk
              </p>
              <h2 className="font-display text-2xl">Sunday night hotspots</h2>
            </div>
            <Button variant="secondary" size="sm">
              View shifts
            </Button>
          </CardHeader>
          <CardBody className="mt-6 grid gap-4">
            {SITE_LIST.map((site) => (
              <div
                key={site}
                className="flex items-center justify-between rounded-2xl bg-sand/70 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{site}</p>
                  <p className="text-xs text-ink/60">1 bartender short</p>
                </div>
                <Badge variant="accent">High risk</Badge>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
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
          </CardHeader>
          <CardBody className="mt-6 space-y-3">
            {OVERTIME_NAMES.map((name) => (
              <div
                key={name}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-ink">{name}</span>
                <Badge>+4 hrs</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </section>

      <InlineAlert
        tone="warn"
        title="Overtime threshold approaching"
        description="Two additional assignments will trigger 7th consecutive day warnings for Seattle staff."
        actions={
          <>
            <Button variant="outline" size="sm">
              Review impacted
            </Button>
            <Button variant="ghost" size="sm">
              Dismiss
            </Button>
          </>
        }
      />
    </div>
  );
}
