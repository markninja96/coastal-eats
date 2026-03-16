import { useState } from 'react';
import { Navigate, useSearch } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  isPasswordWithinPolicy,
  passwordPolicyMessage,
} from '@coastal-eats/shared';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageHeader } from '../components/page-header';
import { Card, CardBody, CardHeader } from '../components/card';
import { Input } from '../components/input';
import { Button } from '../components/button';
import { ApiError, apiUrl } from '../lib/api';
import { useAuth } from '../lib/auth';

const passwordSchema = z
  .string()
  .refine(isPasswordWithinPolicy, passwordPolicyMessage);

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: passwordSchema,
});

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.email('Enter a valid email'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export function LoginRoute() {
  const {
    loginWithEmail,
    registerWithEmail,
    loginPending,
    registerPending,
    loginError,
    registerError,
    session,
  } = useAuth();
  const { redirect } = useSearch({ from: '/login' }) as { redirect?: string };
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });
  const isSubmitting = loginPending || registerPending;
  const isLoginPending = loginPending;
  const isRegisterPending = registerPending;
  const redirectTo = redirect ?? '/';
  const errorSource = mode === 'login' ? loginError : registerError;
  const error = (() => {
    if (!errorSource) return null;
    if (errorSource instanceof ApiError) {
      if (mode === 'login' && errorSource.status === 401) {
        return 'Invalid credentials';
      }
      if (mode === 'register' && errorSource.status === 409) {
        return 'Email already in use';
      }
    }
    return mode === 'login'
      ? 'Sign in failed. Please try again.'
      : 'Registration failed. Please try again.';
  })();

  const handleLoginSubmit = async (values: LoginFormValues) => {
    try {
      await loginWithEmail(values.email, values.password);
      toast.success('Signed in');
    } catch {
      toast.error('Sign in failed');
    }
  };

  const handleRegisterSubmit = async (values: RegisterFormValues) => {
    try {
      await registerWithEmail(values.name, values.email, values.password);
      toast.success('Account created');
    } catch {
      toast.error('Sign up failed');
    }
  };

  if (session?.user) {
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
                  }}
                  disabled={isSubmitting}
                  aria-pressed={mode === 'login'}
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
                  }}
                  disabled={isSubmitting}
                  aria-pressed={mode === 'register'}
                >
                  Register
                </button>
              </div>
            </div>
          </CardHeader>
          <CardBody className="grid gap-4">
            {mode === 'login' ? (
              <form
                className="grid gap-4"
                noValidate
                onSubmit={loginForm.handleSubmit(handleLoginSubmit)}
              >
                <div className="grid gap-2">
                  <label htmlFor="login-email" className="text-sm text-ink/70">
                    Email
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@coastaleats.com"
                    autoComplete="email"
                    required
                    className={
                      loginForm.formState.errors.email
                        ? 'border-rose-300/60 focus-visible:ring-rose-200'
                        : undefined
                    }
                    aria-invalid={
                      loginForm.formState.errors.email ? true : undefined
                    }
                    aria-describedby={
                      loginForm.formState.errors.email
                        ? 'login-email-error'
                        : undefined
                    }
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email?.message ? (
                    <p id="login-email-error" className="text-xs text-rose-200">
                      {loginForm.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <label
                    htmlFor="login-password"
                    className="text-sm text-ink/70"
                  >
                    Password
                  </label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className={
                      loginForm.formState.errors.password
                        ? 'border-rose-300/60 focus-visible:ring-rose-200'
                        : undefined
                    }
                    aria-invalid={
                      loginForm.formState.errors.password ? true : undefined
                    }
                    aria-describedby={
                      loginForm.formState.errors.password
                        ? 'login-password-error'
                        : undefined
                    }
                    {...loginForm.register('password')}
                  />
                  {loginForm.formState.errors.password?.message ? (
                    <p
                      id="login-password-error"
                      className="text-xs text-rose-200"
                    >
                      {loginForm.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>
                {error ? (
                  <p className="rounded-2xl border border-rose-200/30 bg-rose-200/10 px-3 py-2 text-xs text-rose-100">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" disabled={isSubmitting}>
                  {isLoginPending ? 'Signing in...' : 'Continue with email'}
                </Button>
              </form>
            ) : (
              <form
                className="grid gap-4"
                noValidate
                onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}
              >
                <div className="grid gap-2">
                  <label
                    htmlFor="register-name"
                    className="text-sm text-ink/70"
                  >
                    Full name
                  </label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="Avery Admin"
                    autoComplete="name"
                    required
                    className={
                      registerForm.formState.errors.name
                        ? 'border-rose-300/60 focus-visible:ring-rose-200'
                        : undefined
                    }
                    aria-invalid={
                      registerForm.formState.errors.name ? true : undefined
                    }
                    aria-describedby={
                      registerForm.formState.errors.name
                        ? 'register-name-error'
                        : undefined
                    }
                    {...registerForm.register('name')}
                  />
                  {registerForm.formState.errors.name?.message ? (
                    <p
                      id="register-name-error"
                      className="text-xs text-rose-200"
                    >
                      {registerForm.formState.errors.name.message}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <label
                    htmlFor="register-email"
                    className="text-sm text-ink/70"
                  >
                    Email
                  </label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="you@coastaleats.com"
                    autoComplete="email"
                    required
                    className={
                      registerForm.formState.errors.email
                        ? 'border-rose-300/60 focus-visible:ring-rose-200'
                        : undefined
                    }
                    aria-invalid={
                      registerForm.formState.errors.email ? true : undefined
                    }
                    aria-describedby={
                      registerForm.formState.errors.email
                        ? 'register-email-error'
                        : undefined
                    }
                    {...registerForm.register('email')}
                  />
                  {registerForm.formState.errors.email?.message ? (
                    <p
                      id="register-email-error"
                      className="text-xs text-rose-200"
                    >
                      {registerForm.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <label
                    htmlFor="register-password"
                    className="text-sm text-ink/70"
                  >
                    Password
                  </label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="new-password"
                    required
                    className={
                      registerForm.formState.errors.password
                        ? 'border-rose-300/60 focus-visible:ring-rose-200'
                        : undefined
                    }
                    aria-invalid={
                      registerForm.formState.errors.password ? true : undefined
                    }
                    aria-describedby={
                      registerForm.formState.errors.password
                        ? 'register-password-error'
                        : undefined
                    }
                    {...registerForm.register('password')}
                  />
                  {registerForm.formState.errors.password?.message ? (
                    <p
                      id="register-password-error"
                      className="text-xs text-rose-200"
                    >
                      {registerForm.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <label
                    htmlFor="register-confirm-password"
                    className="text-sm text-ink/70"
                  >
                    Confirm password
                  </label>
                  <Input
                    id="register-confirm-password"
                    type="password"
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    required
                    className={
                      registerForm.formState.errors.confirmPassword
                        ? 'border-rose-300/60 focus-visible:ring-rose-200'
                        : undefined
                    }
                    aria-invalid={
                      registerForm.formState.errors.confirmPassword
                        ? true
                        : undefined
                    }
                    aria-describedby={
                      registerForm.formState.errors.confirmPassword
                        ? 'register-confirm-password-error'
                        : undefined
                    }
                    {...registerForm.register('confirmPassword')}
                  />
                  {registerForm.formState.errors.confirmPassword?.message ? (
                    <p
                      id="register-confirm-password-error"
                      className="text-xs text-rose-200"
                    >
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  ) : null}
                </div>
                {error ? (
                  <p className="rounded-2xl border border-rose-200/30 bg-rose-200/10 px-3 py-2 text-xs text-rose-100">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" disabled={isSubmitting}>
                  {isRegisterPending ? 'Creating account...' : 'Create account'}
                </Button>
              </form>
            )}
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
              disabled={isSubmitting}
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
