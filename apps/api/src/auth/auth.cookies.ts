import type { CookieOptions } from 'express';

export const AUTH_COOKIE_NAME = 'coastal-eats.auth';
export const AUTH_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export const COOKIE_SECURITY_DEFAULTS: Pick<
  CookieOptions,
  'httpOnly' | 'sameSite' | 'secure' | 'path'
> = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  ...COOKIE_SECURITY_DEFAULTS,
};
