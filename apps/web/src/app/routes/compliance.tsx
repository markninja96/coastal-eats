import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '../components/page-header';
import { Card, CardBody, CardHeader } from '../components/card';
import { OvertimeMeter } from '../components/overtime-meter';
import { InlineAlert } from '../components/inline-alert';
import { Button } from '../components/button';

export const Route = createFileRoute('/compliance')({
  component: ComplianceRoute,
});

export function ComplianceRoute() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Compliance"
        title="Overtime & labor rules"
        subtitle="Track thresholds and document overrides before shifts lock."
        actions={<Button variant="secondary">Export report</Button>}
      />

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Weekly overtime watch</h2>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <OvertimeMeter label="Sarah Chen" hours={36} limit={40} />
          <OvertimeMeter label="John Rivera" hours={41} limit={40} />
        </CardBody>
      </Card>

      <InlineAlert
        tone="warn"
        title="7th consecutive day requires override"
        description="Maria Santos is scheduled for a 7th day in a row. Add a manager note to proceed."
        actions={<Button size="sm">Add override</Button>}
      />
    </div>
  );
}
