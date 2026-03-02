import { PageHeader } from '../components/page-header';
import { Card, CardBody, CardHeader } from '../components/card';
import { FairnessScore } from '../components/fairness-score';
import { HoursBar } from '../components/hours-bar';
import { PremiumShiftTag } from '../components/premium-shift-tag';
import { StatCard } from '../components/stat-card';

export function FairnessRoute() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fairness"
        title="Shift distribution"
        subtitle="Ensure premium shifts and weekly hours are shared fairly."
      />

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Fairness summary</h2>
        </CardHeader>
        <CardBody className="grid gap-6 md:grid-cols-3">
          <FairnessScore score={82} />
          <StatCard
            title="Premium shifts"
            value="18"
            detail="Fri/Sat evenings"
          />
          <StatCard
            title="Under-scheduled"
            value="3"
            detail="Below desired hours"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Assigned vs desired hours</h2>
        </CardHeader>
        <CardBody className="grid gap-4">
          <div>
            <p className="text-sm text-ink/70">Sarah Chen</p>
            <HoursBar assigned={28} desired={32} />
          </div>
          <div>
            <p className="text-sm text-ink/70">John Rivera</p>
            <HoursBar assigned={36} desired={38} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Premium shift log</h2>
        </CardHeader>
        <CardBody className="grid gap-3">
          <div className="flex items-center justify-between rounded-2xl bg-sand/70 px-4 py-3 text-sm">
            <div>
              <p className="text-ink">Friday 7pm - 11pm</p>
              <p className="text-ink/60">Seattle waterfront · Sarah Chen</p>
            </div>
            <PremiumShiftTag />
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-sand/70 px-4 py-3 text-sm">
            <div>
              <p className="text-ink">Saturday 6pm - 11pm</p>
              <p className="text-ink/60">Miami Beach · Devon Blake</p>
            </div>
            <PremiumShiftTag />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
