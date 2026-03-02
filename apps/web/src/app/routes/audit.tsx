import { PageHeader } from '../components/page-header';
import { Card, CardBody, CardHeader } from '../components/card';
import { Badge } from '../components/badge';
import { Button } from '../components/button';

const auditRows = [
  {
    action: 'Shift updated',
    actor: 'Mia Manager',
    location: 'Seattle waterfront',
    time: 'Mar 2, 3:14 PM',
  },
  {
    action: 'Swap approved',
    actor: 'Logan Manager',
    location: 'Miami Beach',
    time: 'Mar 2, 1:02 PM',
  },
  {
    action: 'Schedule published',
    actor: 'Avery Admin',
    location: 'Boston',
    time: 'Mar 1, 6:40 PM',
  },
];

export function AuditRoute() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Audit"
        title="Schedule audit log"
        subtitle="Track changes across locations with before/after history."
        actions={<Button variant="secondary">Export CSV</Button>}
      />

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Recent changes</h2>
        </CardHeader>
        <CardBody className="grid gap-3">
          {auditRows.map((row) => (
            <div
              key={`${row.action}-${row.time}`}
              className="flex flex-col gap-2 rounded-2xl bg-sand/70 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-ink">{row.action}</p>
                <p className="text-ink/60">{row.actor}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="muted">{row.location}</Badge>
                <span className="text-xs text-ink/50">{row.time}</span>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
