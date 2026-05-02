import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardBody, CardFooter, CardHeader } from '../components/card';
import { Input } from '../components/input';
import { Button } from '../components/button';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const Route = createFileRoute('/settings/profile')({
  component: SettingsProfileRoute,
});

function SettingsProfileRoute() {
  const { session, updateProfile } = useAuth();
  const user = session?.user;
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      setIsSaving(true);
      await updateProfile({ name: values.name });
      toast.success('Profile updated.');
      form.reset({ name: values.name });
    } catch (error) {
      console.error('Failed to update profile', error);
      const fallbackMessage = 'Could not update profile.';
      const rawMessage = error instanceof Error ? error.message : '';
      let friendlyMessage = '';
      if (rawMessage.startsWith('{') || rawMessage.startsWith('[')) {
        try {
          const parsed = JSON.parse(rawMessage) as {
            message?: unknown;
            error?: unknown;
            detail?: unknown;
            errors?: unknown;
          };
          const candidates = [
            parsed.message,
            parsed.error,
            parsed.detail,
            parsed.errors,
          ];
          for (const candidate of candidates) {
            if (typeof candidate === 'string' && candidate.trim().length > 0) {
              friendlyMessage = candidate;
              break;
            }
            if (Array.isArray(candidate) && candidate.length > 0) {
              const [first] = candidate;
              if (typeof first === 'string' && first.trim().length > 0) {
                friendlyMessage = first;
                break;
              }
              if (
                first &&
                typeof first === 'object' &&
                'message' in first &&
                typeof first.message === 'string' &&
                first.message.trim().length > 0
              ) {
                friendlyMessage = first.message;
                break;
              }
            }
          }
        } catch {
          friendlyMessage = '';
        }
      }
      toast.error(friendlyMessage || fallbackMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Profile</h2>
          <p className="text-sm text-ink/60">
            Update your personal details and display preferences.
          </p>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="settings-profile-name"
              className="text-sm text-ink/70"
            >
              Full name
            </label>
            <Input id="settings-profile-name" {...form.register('name')} />
            {form.formState.errors.name ? (
              <p className="text-xs text-coral">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label
              htmlFor="settings-profile-email"
              className="text-sm text-ink/70"
            >
              Email
            </label>
            <Input
              id="settings-profile-email"
              defaultValue={user?.email ?? ''}
              disabled
            />
          </div>
        </CardBody>
        <CardFooter>
          <Button variant="secondary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
