import { PageHeader } from '../components/page-header';
import { WeeklyGrid } from '../components/weekly-grid';
import { ShiftCard } from '../components/shift-card';
import { Button } from '../components/button';
import { Card, CardBody, CardHeader } from '../components/card';
import { ConflictBanner } from '../components/conflict-banner';

const WEEKLY_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DEFAULT_SHIFTS = [
  {
    id: '1',
    day: 'Mon',
    start: '10 AM',
    end: '4 PM',
    title: 'Line cook',
    status: 'published' as const,
  },
  {
    id: '2',
    day: 'Wed',
    start: '2 PM',
    end: '10 PM',
    title: 'Bartender',
    meta: '2 of 3 filled',
    status: 'draft' as const,
  },
  {
    id: '3',
    day: 'Fri',
    start: '4 PM',
    end: '11 PM',
    title: 'Server',
    meta: 'Overtime risk',
    status: 'published' as const,
  },
];

export function ScheduleRoute() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Scheduling"
        title="Weekly schedule"
        subtitle="Build, publish, and adjust shifts with live conflict checks."
        actions={
          <>
            <Button>New shift</Button>
            <Button variant="secondary">Publish week</Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Week of March 2</h2>
        </CardHeader>
        <CardBody>
          <WeeklyGrid days={WEEKLY_DAYS} shifts={DEFAULT_SHIFTS} />
        </CardBody>
      </Card>

      <ConflictBanner
        title="John Rivera already scheduled"
        description="This assignment overlaps with a shift at Portland Pearl."
        rule="No double-booking"
        suggestions={[
          { name: 'Sarah Chen', detail: 'Server · Available' },
          { name: 'Maria Santos', detail: 'Server · Certified' },
        ]}
      />

      <ShiftCard
        title="Dinner service"
        timeRange="Fri, 5:00 PM - 11:00 PM"
        location="Seattle waterfront"
        headcount="2 of 4 filled"
        status="draft"
        assignments={[
          { name: 'Sarah Chen', role: 'Lead', status: 'assigned' },
          { name: 'Open slot', status: 'swap' },
        ]}
        actions={<Button size="sm">Assign staff</Button>}
      />
    </div>
  );
}
