import { CalendarDays } from 'lucide-react';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Calendar } from '../components/calendar';
import { Card, CardBody, CardHeader } from '../components/card';
import { InlineAlert } from '../components/inline-alert';
import { Input } from '../components/input';
import { PageHeader } from '../components/page-header';
import { StatCard } from '../components/stat-card';
import { Textarea } from '../components/textarea';
import { TimezoneSelect } from '../components/timezone-select';

export function ComponentsRoute() {
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
          <Input placeholder="Shift title" />
          <Textarea placeholder="Notes for the team" />
          <TimezoneSelect />
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
    </div>
  );
}
