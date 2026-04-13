import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '../components/page-header';
import { Card, CardBody, CardHeader } from '../components/card';
import { NotificationItem } from '../components/notification-item';
import { LiveIndicator } from '../components/live-indicator';
import { Button } from '../components/button';

export const Route = createFileRoute('/notifications')({
  component: NotificationsRoute,
});

export function NotificationsRoute() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Notifications"
        title="Notification center"
        subtitle="Track schedule updates and swap activity in real time."
        actions={<Button variant="secondary">Mark all read</Button>}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="font-display text-2xl">Latest</h2>
          <LiveIndicator />
        </CardHeader>
        <CardBody className="grid gap-4">
          <NotificationItem
            title="Schedule published"
            body="Seattle waterfront shifts are live for next week."
            time="Just now"
            unread
          />
          <NotificationItem
            title="Swap approved"
            body="John Rivera accepted the Friday shift."
            time="12m ago"
          />
          <NotificationItem
            title="Overtime warning"
            body="Maria Santos is projected to hit 41 hours."
            time="1h ago"
          />
        </CardBody>
      </Card>
    </div>
  );
}
