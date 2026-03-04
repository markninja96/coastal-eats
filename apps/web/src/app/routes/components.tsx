import * as React from 'react';
import { CalendarDays } from 'lucide-react';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Calendar } from '../components/calendar';
import { Card, CardBody, CardHeader } from '../components/card';
import { ConflictBanner } from '../components/conflict-banner';
import { InlineAlert } from '../components/inline-alert';
import { Input } from '../components/input';
import { PageHeader } from '../components/page-header';
import { StatCard } from '../components/stat-card';
import { Textarea } from '../components/textarea';
import { TimezoneSelect } from '../components/timezone-select';
import { WeeklyGrid } from '../components/weekly-grid';
import { AvailabilityBadge } from '../components/availability-badge';
import { ApprovalActions } from '../components/approval-actions';
import { EmptyState } from '../components/empty-state';
import { FairnessScore } from '../components/fairness-score';
import { HoursBar } from '../components/hours-bar';
import { LiveIndicator } from '../components/live-indicator';
import { NotificationItem } from '../components/notification-item';
import { OvertimeMeter } from '../components/overtime-meter';
import { PremiumShiftTag } from '../components/premium-shift-tag';
import { PresenceList } from '../components/presence-list';
import { SwapRequestCard } from '../components/swap-request-card';
import { ShiftCard } from '../components/shift-card';

export function ComponentsRoute() {
  const shiftTitleId = React.useId();
  const notesId = React.useId();
  const timezoneId = React.useId();

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="UI library"
        title="Component gallery"
        subtitle="Quick visual scan of reusable pieces for ShiftSync."
        actions={<Button variant="secondary">New component</Button>}
      />

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Buttons</h2>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button size="sm">Small</Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Badges</h2>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="muted">Muted</Badge>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Stat card</h2>
        </CardHeader>
        <CardBody>
          <StatCard
            title="Shifts this week"
            value="128"
            detail="8 locations covered"
            icon={CalendarDays}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Inline alert</h2>
        </CardHeader>
        <CardBody className="grid gap-4">
          <InlineAlert
            tone="info"
            title="Schedule draft saved"
            description="You have 2 hours left to publish before the cutoff."
          />
          <InlineAlert
            tone="warn"
            title="Overtime threshold approaching"
            description="Two assignments will trigger weekly overtime."
            actions={
              <Button size="sm" variant="outline">
                Review impacted
              </Button>
            }
          />
          <InlineAlert
            tone="success"
            title="Swap approved"
            description="All parties were notified and the schedule updated."
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Form fields</h2>
        </CardHeader>
        <CardBody className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor={shiftTitleId} className="text-sm text-ink/70">
              Shift title
            </label>
            <Input id={shiftTitleId} placeholder="Shift title" />
          </div>
          <div className="grid gap-2">
            <label htmlFor={notesId} className="text-sm text-ink/70">
              Notes for the team
            </label>
            <Textarea id={notesId} placeholder="Notes for the team" />
          </div>
          <div className="grid gap-2">
            <label htmlFor={timezoneId} className="text-sm text-ink/70">
              Timezone
            </label>
            <TimezoneSelect id={timezoneId} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Calendar</h2>
        </CardHeader>
        <CardBody>
          <Calendar mode="single" />
        </CardBody>
      </Card>

      <ShiftDemo />
      <WeeklyGridDemo />
      <AvailabilityDemo />
      <SwapRequestDemo />
      <ComplianceDemo />
      <NotificationsDemo />
      <EmptyStateDemo />
    </div>
  );
}

function ShiftDemo() {
  return (
    <ShiftCard
      title="Bartender coverage"
      timeRange="Fri, 4:00 PM - 12:00 AM"
      location="Seattle waterfront"
      headcount="2 of 3 filled"
      status="published"
      assignments={[
        {
          id: 'sarah-chen',
          name: 'Sarah Chen',
          role: 'Lead',
          status: 'assigned',
        },
        {
          id: 'john-rivera',
          name: 'John Rivera',
          role: 'Backup',
          status: 'pending',
        },
        { id: 'open-slot', name: 'Open slot', status: 'swap' },
      ]}
      actions={<Button size="sm">Assign</Button>}
    />
  );
}

function WeeklyGridDemo() {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-2xl">Weekly grid</h2>
      </CardHeader>
      <CardBody>
        <WeeklyGrid
          days={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']}
          shifts={[
            {
              id: '1',
              day: 'Mon',
              start: '10 AM',
              end: '4 PM',
              title: 'Line cook',
              status: 'published',
            },
            {
              id: '2',
              day: 'Wed',
              start: '2 PM',
              end: '10 PM',
              title: 'Bartender',
              meta: '2 of 3 filled',
              status: 'draft',
            },
            {
              id: '3',
              day: 'Fri',
              start: '4 PM',
              end: '11 PM',
              title: 'Server',
              meta: 'Overtime risk',
              status: 'published',
            },
          ]}
        />
      </CardBody>
    </Card>
  );
}

function AvailabilityDemo() {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-2xl">Availability + conflicts</h2>
      </CardHeader>
      <CardBody className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <AvailabilityBadge status="available" label="Available" />
          <AvailabilityBadge status="partial" label="Partial" />
          <AvailabilityBadge status="unavailable" label="Unavailable" />
        </div>
        <ConflictBanner
          title="Sarah Chen is unavailable"
          description="This shift falls outside the staff member's availability window."
          rule="Availability"
          suggestions={[
            { name: 'John Rivera', detail: 'Server · Available' },
            { name: 'Maria Santos', detail: 'Server · Certified' },
          ]}
        />
      </CardBody>
    </Card>
  );
}

function SwapRequestDemo() {
  return (
    <SwapRequestCard
      requester="Sarah Chen"
      shift="Fri, 4:00 PM - 12:00 AM · Seattle waterfront"
      status="pending"
      type="swap"
      expiresIn="22h"
      note="Doctor appointment. Can swap with another server."
      actions={<ApprovalActions />}
    />
  );
}

function ComplianceDemo() {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-2xl">Compliance + fairness</h2>
      </CardHeader>
      <CardBody className="grid gap-6 md:grid-cols-2">
        <OvertimeMeter label="Projected hours" hours={38} limit={40} />
        <FairnessScore score={82} />
        <HoursBar assigned={28} desired={32} />
        <div className="flex items-center gap-2">
          <PremiumShiftTag />
          <span className="text-sm text-ink/60">Friday 7pm - 11pm</span>
        </div>
      </CardBody>
    </Card>
  );
}

function NotificationsDemo() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="font-display text-2xl">Notifications + presence</h2>
        <LiveIndicator />
      </CardHeader>
      <CardBody className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <NotificationItem
            title="Swap approved"
            body="John Rivera accepted the Friday shift."
            time="2m ago"
            unread
          />
          <NotificationItem
            title="Overtime warning"
            body="Maria Santos is projected to hit 41 hours."
            time="1h ago"
          />
        </div>
        <PresenceList
          items={[
            { name: 'Devon Blake', role: 'Host', location: 'Miami Beach' },
            {
              name: 'John Rivera',
              role: 'Server',
              location: 'Seattle waterfront',
            },
          ]}
        />
      </CardBody>
    </Card>
  );
}

function EmptyStateDemo() {
  return (
    <EmptyState
      title="No swap requests"
      description="Staff haven’t submitted any swap or drop requests yet."
      action={<Button size="sm">Invite staff</Button>}
    />
  );
}
