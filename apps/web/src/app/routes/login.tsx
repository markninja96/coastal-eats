import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { Navigate, useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageHeader } from '../components/page-header';
import { Card, CardBody, CardHeader } from '../components/card';
import { Input } from '../components/input';
import { Button } from '../components/button';
import { apiUrl } from '../lib/api';
import { useAuth } from '../lib/auth';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const toFieldErrors = (
  errors: Record<string, string[] | undefined>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(errors)
      .filter(([, value]) => value?.length)
      .map(([key, value]) => [key, value?.[0] ?? 'Invalid value']),
  );

export function LoginRoute() {
  const {
    loginWithEmail,
    registerWithEmail,
    loginPending,
    registerPending,
    loginError,
    registerError,
    session,
    status,
  } = useAuth();
  const { redirect } = useSearch({ from: '/login' }) as { redirect?: string };
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isSubmitting = status === 'loading';
  const isLoginPending = isSubmitting || loginPending;
  const isRegisterPending = isSubmitting || registerPending;
  const redirectTo = useMemo(() => redirect ?? '/', [redirect]);
  const error = useMemo(() => {
    const nextError = mode === 'login' ? loginError : registerError;
    return nextError?.message ?? null;
  }, [loginError, mode, registerError]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    try {
      if (mode === 'login') {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) {
          setFieldErrors(toFieldErrors(parsed.error.flatten().fieldErrors));
          return;
        }
        await loginWithEmail(email, password);
        toast.success('Signed in');
      } else {
        const parsed = registerSchema.safeParse({
          name,
          email,
          password,
          confirmPassword,
        });
        if (!parsed.success) {
          setFieldErrors(toFieldErrors(parsed.error.flatten().fieldErrors));
          return;
        }
        await registerWithEmail(name, email, password);
        toast.success('Account created');
      }
    } catch {
      toast.error(mode === 'login' ? 'Sign in failed' : 'Sign up failed');
    }
  };

  if (session?.accessToken) {
    return <Navigate to={redirectTo} />;
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Access"
        title={mode === 'login' ? 'Sign in' : 'Create your account'}
        subtitle="Use email or continue with Google for the demo."
      />

      <div className="grid gap-6 lg:items-start lg:justify-center lg:grid-cols-[520px_420px]">
        <Card className="order-1 lg:order-2">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl">
                {mode === 'login' ? 'Welcome back' : 'Create your profile'}
              </h2>
              <div className="ml-auto flex rounded-full border border-white/15 bg-white/5 p-1 text-xs">
                <button
                  type="button"
                  className={`cursor-pointer rounded-full px-3 py-1 ${
                    mode === 'login' ? 'bg-white/15 text-white' : 'text-ink/60'
                  }`}
                  onClick={() => {
                    setMode('login');
                    setFieldErrors({});
                  }}
                  disabled={isSubmitting}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`cursor-pointer rounded-full px-3 py-1 ${
                    mode === 'register'
                      ? 'bg-white/15 text-white'
                      : 'text-ink/60'
                  }`}
                  onClick={() => {
                    setMode('register');
                    setFieldErrors({});
                  }}
                  disabled={isSubmitting}
                >
                  Register
                </button>
              </div>
            </div>
          </CardHeader>
          <CardBody className="grid gap-4">
            <form className="grid gap-4" onSubmit={handleSubmit}>
              {mode === 'register' ? (
                <div className="grid gap-2">
                  <label htmlFor="login-name" className="text-sm text-ink/70">
                    Full name
                  </label>
                  <Input
                    id="login-name"
                    type="text"
                    placeholder="Avery Admin"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    required
                    className={
                      fieldErrors.name
                        ? 'border-rose-300/60 focus-visible:ring-rose-200'
                        : undefined
                    }
                    aria-invalid={fieldErrors.name ? true : undefined}
                  />
                  {fieldErrors.name ? (
                    <p className="text-xs text-rose-200">{fieldErrors.name}</p>
                  ) : null}
                </div>
              ) : null}
              <div className="grid gap-2">
                <label htmlFor="login-email" className="text-sm text-ink/70">
                  Email
                </label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@coastaleats.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  className={
                    fieldErrors.email
                      ? 'border-rose-300/60 focus-visible:ring-rose-200'
                      : undefined
                  }
                  aria-invalid={fieldErrors.email ? true : undefined}
                />
                {fieldErrors.email ? (
                  <p className="text-xs text-rose-200">{fieldErrors.email}</p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <label htmlFor="login-password" className="text-sm text-ink/70">
                  Password
                </label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  required
                  className={
                    fieldErrors.password
                      ? 'border-rose-300/60 focus-visible:ring-rose-200'
                      : undefined
                  }
                  aria-invalid={fieldErrors.password ? true : undefined}
                />
                {fieldErrors.password ? (
                  <p className="text-xs text-rose-200">
                    {fieldErrors.password}
                  </p>
                ) : null}
              </div>
              {mode === 'register' ? (
                <div className="grid gap-2">
                  <label
                    htmlFor="login-confirm-password"
                    className="text-sm text-ink/70"
                  >
                    Confirm password
                  </label>
                  <Input
                    id="login-confirm-password"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                    className={
                      fieldErrors.confirmPassword
                        ? 'border-rose-300/60 focus-visible:ring-rose-200'
                        : undefined
                    }
                    aria-invalid={
                      fieldErrors.confirmPassword ? true : undefined
                    }
                  />
                  {fieldErrors.confirmPassword ? (
                    <p className="text-xs text-rose-200">
                      {fieldErrors.confirmPassword}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {error ? (
                <p className="rounded-2xl border border-rose-200/30 bg-rose-200/10 px-3 py-2 text-xs text-rose-100">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={isSubmitting}>
                {mode === 'login'
                  ? isLoginPending
                    ? 'Signing in...'
                    : 'Continue with email'
                  : isRegisterPending
                    ? 'Creating account...'
                    : 'Create account'}
              </Button>
            </form>
            <div className="flex items-center gap-3 text-xs text-ink/50">
              <span className="h-px flex-1 bg-white/10" />
              or
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                window.location.href = apiUrl('/api/auth/google');
              }}
            >
              Continue with Google
            </Button>
          </CardBody>
        </Card>

        <div className="order-2 grid gap-4 lg:order-1">
          <Card>
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.3em] text-ink/40">
                What you can do
              </p>
              <h3 className="font-display text-2xl">ShiftSync tools</h3>
            </CardHeader>
            <CardBody className="grid gap-3 text-sm text-ink/70">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Build weekly schedules, publish shifts, and spot conflicts
                early.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Assign staff with availability and rest-rule checks in real
                time.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Track swap approvals and keep coverage visible across locations.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Staff can view their shifts, request swaps, and track approvals.
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.3em] text-ink/40">
                Demo access
              </p>
              <h3 className="font-display text-2xl">Use a seeded account</h3>
            </CardHeader>
            <CardBody className="grid gap-3 text-sm text-ink/70">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="font-semibold text-ink">Admin</p>
                <p>admin@coastaleats.com</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="font-semibold text-ink">Staff</p>
                <p>sarah@coastaleats.com</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="font-semibold text-ink">Manager</p>
                <p>mia.manager@coastaleats.com</p>
              </div>
              <p className="text-xs text-ink/50">
                Password for seeded users: Password123!
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
