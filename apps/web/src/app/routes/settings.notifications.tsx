import { createFileRoute } from '@tanstack/react-router';
import { Card, CardBody, CardFooter, CardHeader } from '../components/card';
import { Button } from '../components/button';

const NOTIFICATION_ITEMS = [
  {
    label: 'Schedule published alerts',
    hint: 'Notify me when weekly schedules are published or revised.',
  },
  {
    label: 'Swap request updates',
    hint: 'Notify me when swap/drop requests are approved or denied.',
  },
  {
    label: 'Compliance reminders',
    hint: 'Notify me before overtime or rest warnings become blockers.',
  },
] as const;

export const Route = createFileRoute('/settings/notifications')({
  component: SettingsNotificationsRoute,
});

function SettingsNotificationsRoute() {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-2xl">Notification preferences</h2>
        <p className="text-sm text-ink/60">
          Choose which updates you receive as soon as staffing changes happen.
        </p>
      </CardHeader>
      <CardBody>
        {NOTIFICATION_ITEMS.map((item) => (
          <label
            key={item.label}
            className="flex items-start justify-between gap-4 rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
          >
            <span>
              <span className="block text-sm font-medium text-ink">
                {item.label}
              </span>
              <span className="block text-xs text-ink/60">{item.hint}</span>
            </span>
            <input
              type="checkbox"
              defaultChecked
              className="mt-1 h-4 w-4 rounded border-white/25 bg-transparent accent-coral"
            />
          </label>
        ))}
      </CardBody>
      <CardFooter>
        <Button variant="secondary">Save preferences</Button>
      </CardFooter>
    </Card>
  );
}
