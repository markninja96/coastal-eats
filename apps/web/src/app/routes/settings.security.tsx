import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  isPasswordWithinPolicy,
  passwordPolicyMessage,
} from '@coastal-eats/shared';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardBody, CardFooter, CardHeader } from '../components/card';
import { Input } from '../components/input';
import { Button } from '../components/button';
import { useAuth } from '../lib/auth';

const newPasswordSchema = z
  .string()
  .refine(isPasswordWithinPolicy, passwordPolicyMessage);

const securitySchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SecurityFormValues = z.infer<typeof securitySchema>;

export const Route = createFileRoute('/settings/security')({
  component: SettingsSecurityRoute,
});

function SettingsSecurityRoute() {
  const { updatePassword } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: SecurityFormValues) => {
    try {
      setIsSaving(true);
      await updatePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      form.reset();
      toast.success('Password updated.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not update password.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Security</h2>
          <p className="text-sm text-ink/60">
            Rotate your password regularly to keep your account secure.
          </p>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label
              htmlFor="settings-security-current-password"
              className="text-sm text-ink/70"
            >
              Current password
            </label>
            <Input
              id="settings-security-current-password"
              type="password"
              autoComplete="current-password"
              {...form.register('currentPassword')}
            />
            {form.formState.errors.currentPassword ? (
              <p className="text-xs text-coral">
                {form.formState.errors.currentPassword.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label
              htmlFor="settings-security-new-password"
              className="text-sm text-ink/70"
            >
              New password
            </label>
            <Input
              id="settings-security-new-password"
              type="password"
              autoComplete="new-password"
              {...form.register('newPassword')}
            />
            {form.formState.errors.newPassword ? (
              <p className="text-xs text-coral">
                {form.formState.errors.newPassword.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label
              htmlFor="settings-security-confirm-password"
              className="text-sm text-ink/70"
            >
              Confirm new password
            </label>
            <Input
              id="settings-security-confirm-password"
              type="password"
              autoComplete="new-password"
              {...form.register('confirmPassword')}
            />
            {form.formState.errors.confirmPassword ? (
              <p className="text-xs text-coral">
                {form.formState.errors.confirmPassword.message}
              </p>
            ) : null}
          </div>
        </CardBody>
        <CardFooter>
          <Button variant="secondary" type="submit" disabled={isSaving}>
            {isSaving ? 'Updating...' : 'Update password'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
