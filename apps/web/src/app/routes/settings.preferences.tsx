import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardBody, CardFooter, CardHeader } from '../components/card';
import { Button } from '../components/button';
import { Select } from '../components/select';
import { useAuth } from '../lib/auth';
import { listLocations } from '../lib/locations';
import { toast } from 'sonner';

const preferencesSchema = z.object({
  homeTimezone: z.string().trim().min(2, 'Select a valid timezone.'),
  weekStart: z.enum(['monday', 'sunday']),
});

type PreferencesFormValues = z.infer<typeof preferencesSchema>;

const getTimeZoneOffsetMs = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  const utcDate = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return utcDate - date.getTime();
};

const formatGmtOffsetLabel = (timeZone: string) => {
  const offsetMinutes = Math.round(
    getTimeZoneOffsetMs(new Date(), timeZone) / 60000,
  );
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  if (minutes === 0) {
    return `GMT${sign}${hours}`;
  }
  return `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
};

export const Route = createFileRoute('/settings/preferences')({
  component: SettingsPreferencesRoute,
});

function SettingsPreferencesRoute() {
  const { session, status, updatePreferences } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: ({ signal }) => listLocations({ signal }),
    enabled: status === 'ready',
  });
  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      homeTimezone: session?.user?.homeTimezone ?? 'UTC',
      weekStart:
        localStorage.getItem('coastal-eats.weekStart') === 'sunday'
          ? 'sunday'
          : 'monday',
    },
  });
  const timezoneOptions = Array.from(
    new Set(
      (locationsQuery.data ?? [])
        .map((location) => location.timezone)
        .filter(Boolean),
    ),
  ).sort();
  if (
    session?.user?.homeTimezone &&
    !timezoneOptions.includes(session.user.homeTimezone)
  ) {
    timezoneOptions.push(session.user.homeTimezone);
  }
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (localTimezone && !timezoneOptions.includes(localTimezone)) {
    timezoneOptions.push(localTimezone);
  }
  if (!timezoneOptions.includes('UTC')) {
    timezoneOptions.push('UTC');
  }
  timezoneOptions.sort();

  const onSubmit = async (values: PreferencesFormValues) => {
    try {
      setIsSaving(true);
      await updatePreferences({ homeTimezone: values.homeTimezone });
      try {
        localStorage.setItem('coastal-eats.weekStart', values.weekStart);
      } catch (storageError) {
        console.warn(
          'Failed to persist week start preference locally',
          storageError,
        );
      }
      toast.success('Preferences saved.');
      form.reset(values);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not save preferences.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Regional preferences</h2>
          <p className="text-sm text-ink/60">
            Set how time and schedules are displayed across the app.
          </p>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="settings-preferences-timezone"
              className="text-sm text-ink/70"
            >
              Home timezone
            </label>
            <Select
              id="settings-preferences-timezone"
              {...form.register('homeTimezone')}
            >
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {`${timezone} (${formatGmtOffsetLabel(timezone)})`}
                </option>
              ))}
            </Select>
            {form.formState.errors.homeTimezone ? (
              <p className="text-xs text-coral">
                {form.formState.errors.homeTimezone.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label
              htmlFor="settings-preferences-week-start"
              className="text-sm text-ink/70"
            >
              Week starts on
            </label>
            <Select
              id="settings-preferences-week-start"
              {...form.register('weekStart')}
            >
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </Select>
            {form.formState.errors.weekStart ? (
              <p className="text-xs text-coral">
                {form.formState.errors.weekStart.message}
              </p>
            ) : null}
          </div>
        </CardBody>
        <CardFooter>
          <Button variant="secondary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save preferences'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
