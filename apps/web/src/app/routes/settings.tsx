import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { PageHeader } from '../components/page-header';
import { Card } from '../components/card';

const SETTINGS_TABS = [
  { to: '/settings/profile', label: 'Profile' },
  { to: '/settings/security', label: 'Security' },
  { to: '/settings/notifications', label: 'Notifications' },
  { to: '/settings/preferences', label: 'Preferences' },
] as const;

export const Route = createFileRoute('/settings')({
  beforeLoad: ({ location }) => {
    if (location.pathname === '/settings') {
      throw redirect({ to: '/settings/profile' });
    }
  },
  component: SettingsLayout,
});

function SettingsLayout() {
  return (
    <div className="space-y-6">
      <Card className="p-8">
        <PageHeader
          eyebrow="Settings"
          title="Personalize your workspace"
          subtitle="Manage your profile, security, notifications, and regional preferences."
        />
      </Card>

      <Card className="p-3">
        <nav className="flex flex-wrap gap-2" aria-label="Settings sections">
          {SETTINGS_TABS.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              activeProps={{ className: 'bg-white/20 text-white shadow-soft' }}
              className="rounded-full px-4 py-2 text-sm text-ink/80 transition hover:bg-white/15"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </Card>

      <Outlet />
    </div>
  );
}
