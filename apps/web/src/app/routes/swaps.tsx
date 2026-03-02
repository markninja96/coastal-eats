import { PageHeader } from '../components/page-header';
import { SwapRequestCard } from '../components/swap-request-card';
import { ApprovalActions } from '../components/approval-actions';
import { CountdownTag } from '../components/countdown-tag';
import { Card, CardBody, CardHeader } from '../components/card';
import { Button } from '../components/button';

export function SwapsRoute() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Coverage"
        title="Swap & drop requests"
        subtitle="Approve requests and keep shifts covered before cutoff."
        actions={<Button variant="secondary">Export requests</Button>}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="font-display text-2xl">Pending approvals</h2>
          <CountdownTag label="Cutoff in 36h" tone="warning" />
        </CardHeader>
        <CardBody className="grid gap-4">
          <SwapRequestCard
            requester="Sarah Chen"
            shift="Fri, 4:00 PM - 12:00 AM · Seattle waterfront"
            status="pending"
            type="swap"
            expiresIn="22h"
            note="Doctor appointment. Can swap with another server."
            actions={<ApprovalActions />}
          />
          <SwapRequestCard
            requester="Devon Blake"
            shift="Sat, 11:00 AM - 6:00 PM · Miami Beach"
            status="pending"
            type="drop"
            expiresIn="30h"
            actions={<ApprovalActions approveLabel="Approve drop" />}
          />
        </CardBody>
      </Card>
    </div>
  );
}
