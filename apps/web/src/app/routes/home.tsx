import {
  CalendarDays,
  ClipboardList,
  ShieldCheck,
  Users,
  UserCheck,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Card, CardBody, CardHeader } from '../components/card';
import { InlineAlert } from '../components/inline-alert';
import { PageHeader } from '../components/page-header';
import { StatCard } from '../components/stat-card';
import { useAuth } from '../lib/auth';

const SITE_LIST = ['Seattle waterfront', 'Portland Pearl', 'Miami Beach'];
const OVERTIME_NAMES = ['Sarah Chen', 'John Rivera', 'Maria Santos'];
const STAFF_UP_NEXT = [
  {
    name: 'Dinner service',
    time: 'Fri, 5:00 PM - 11:00 PM',
    location: 'Seattle waterfront',
  },
  {
    name: 'Brunch shift',
    time: 'Sun, 9:00 AM - 3:00 PM',
    location: 'Seattle waterfront',
  },
];
const STAFF_REQUESTS = [
  { label: 'Swap requests', value: '1 pending' },
  { label: 'Upcoming availability', value: '2 reminders' },
];

export function HomeRoute() {
  const navigate = useNavigate();
  const { session, status } = useAuth();
  const role = session?.user?.role;

  if (status === 'loading') {
    return (
      <div className="space-y-8">
        <Card className="p-8">
          <PageHeader
            eyebrow="ShiftSync"
            title="Loading your dashboard"
            subtitle="Fetching the latest coverage and staffing data."
          />
        </Card>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="space-y-8">
        <Card className="p-8">
          <PageHeader
            eyebrow="ShiftSync"
            title="Session unavailable"
            subtitle="We couldn't load your profile. Please sign in again."
            actions={
              <Button onClick={() => navigate({ to: '/login' })}>
                Back to sign in
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  if (role === 'admin') {
    return <AdminDashboard />;
  }

  if (role === 'manager') {
    return <ManagerDashboard />;
  }

  return <StaffDashboard />;
}

function AdminDashboard() {
  const stats = [
    {
      title: 'Shifts this week',
      value: '128',
      detail: '8 locations covered',
      icon: CalendarDays,
    },
    {
      title: 'Open roles',
      value: '14',
      detail: 'Across 5 locations',
      icon: Users,
    },
    {
      title: 'Compliance checks',
      value: '3',
      detail: 'Pending review',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-8">
      <Card className="p-8">
        <PageHeader
          eyebrow="ShiftSync"
          title="Multi-location operations overview."
          subtitle="Balance staffing, approve policies, and keep compliance healthy across every region."
          actions={
            <>
              <Button>Review compliance</Button>
              <Button variant="secondary">Export staffing</Button>
            </>
          }
        />
      </Card>

      <InlineAlert
        tone="warn"
        title="Overtime threshold approaching"
        description="Two additional assignments will trigger consecutive day warnings for Seattle staff."
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
              <h2 className="font-display text-2xl">Weekend hotspots</h2>
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
              Three staff are projected above 35 hours if weekend shifts are
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
    </div>
  );
}

function ManagerDashboard() {
  const stats = [
    {
      title: 'Shifts this week',
      value: '34',
      detail: 'Seattle + Portland',
      icon: CalendarDays,
    },
    {
      title: 'Pending swaps',
      value: '4',
      detail: '2 need approval',
      icon: ClipboardList,
    },
    {
      title: 'Open roles',
      value: '5',
      detail: 'Friday coverage',
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      <Card className="p-8">
        <PageHeader
          eyebrow="ShiftSync"
          title="Seattle & Portland scheduling."
          subtitle="Publish weekly coverage, resolve swaps, and keep staffing levels balanced."
          actions={
            <>
              <Button>Create shift</Button>
              <Button variant="secondary">Review swaps</Button>
            </>
          }
        />
      </Card>

      <InlineAlert
        tone="warn"
        title="Two shifts still unassigned"
        description="Assign certified staff or broadcast open roles before Wednesday noon."
        actions={
          <>
            <Button variant="outline" size="sm">
              View open shifts
            </Button>
            <Button variant="ghost" size="sm">
              Remind staff
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-ink/40">
                Coverage risk
              </p>
              <h2 className="font-display text-2xl">Friday gaps</h2>
            </div>
            <Button variant="secondary" size="sm">
              Assign staff
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
                <Badge variant="accent">Needs coverage</Badge>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-sm uppercase tracking-[0.2em] text-ink/40">
              On deck
            </p>
            <h2 className="mt-2 font-display text-2xl">Swap requests</h2>
            <p className="mt-3 text-sm text-ink/60">
              Prioritize swaps that impact published shifts this weekend.
            </p>
          </CardHeader>
          <CardBody className="mt-6 space-y-3">
            {['Sarah Chen', 'Devon Blake', 'Maria Santos'].map((name) => (
              <div
                key={name}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-ink">{name}</span>
                <Badge>Pending</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}

function StaffDashboard() {
  const stats = [
    {
      title: 'Next shift',
      value: 'Fri, 5 PM',
      detail: 'Seattle waterfront',
      icon: UserCheck,
    },
    {
      title: 'Hours this week',
      value: '32',
      detail: 'Goal: 35 hrs',
      icon: CalendarDays,
    },
    {
      title: 'Swap requests',
      value: '1',
      detail: 'Awaiting response',
      icon: ClipboardList,
    },
  ];

  return (
    <div className="space-y-8">
      <Card className="p-8">
        <PageHeader
          eyebrow="ShiftSync"
          title="Your schedule at a glance."
          subtitle="Track upcoming shifts, requests, and approvals in one place."
          actions={
            <>
              <Button>Request swap</Button>
              <Button variant="secondary">Update availability</Button>
            </>
          }
        />
      </Card>

      <InlineAlert
        tone="info"
        title="Availability check"
        description="Update availability for next week by Thursday at noon."
        actions={
          <>
            <Button variant="outline" size="sm">
              Update now
            </Button>
            <Button variant="ghost" size="sm">
              Later
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-ink/40">
                Up next
              </p>
              <h2 className="font-display text-2xl">Upcoming shifts</h2>
            </div>
            <Button variant="secondary" size="sm">
              View schedule
            </Button>
          </CardHeader>
          <CardBody className="mt-6 grid gap-4">
            {STAFF_UP_NEXT.map((shift) => (
              <div
                key={shift.name}
                className="flex items-center justify-between rounded-2xl bg-sand/70 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{shift.name}</p>
                  <p className="text-xs text-ink/60">{shift.time}</p>
                </div>
                <Badge>{shift.location}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-sm uppercase tracking-[0.2em] text-ink/40">
              Requests
            </p>
            <h2 className="mt-2 font-display text-2xl">Your activity</h2>
            <p className="mt-3 text-sm text-ink/60">
              Track swaps and availability reminders for this week.
            </p>
          </CardHeader>
          <CardBody className="mt-6 space-y-3">
            {STAFF_REQUESTS.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-ink">{item.label}</span>
                <Badge>{item.value}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
