# API Notes

Quick notes for the Nest API app.

## Environment

- Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL`.
- Set JWT + Google OAuth vars if using auth endpoints.

Staging callback URL:

- `https://coastal-eats-api.onrender.com/api/auth/google/callback`

Note: set real OAuth secrets in Render env vars (do not commit).

## Database (Drizzle)

- Generate migration: `pnpm db:generate --name init`
- Apply schema (dev only): `pnpm db:push`
- Run migrations (staging/prod): `pnpm db:migrate`
- Seed data: `pnpm db:seed`
- Open Drizzle Studio: `pnpm db:studio`

Note: Drizzle config reads `DATABASE_URL` from the environment.

## Run locally

- `pnpm nx serve api`

## Auth

- Email login: `POST /api/auth/login` with `{ email, password }`.
- Google OAuth: `GET /api/auth/google` and callback at `/api/auth/google/callback`.
- Current user: `GET /api/auth/me` with `Authorization: Bearer <token>`.

Test credentials:

- Run `pnpm db:seed` to generate local accounts.
- Store any default credentials in a secrets manager or CI/CD secrets (never in repo docs).
- Rotate or revoke test credentials after use.

## Deployment (Render)

- Build: `pnpm install --frozen-lockfile && pnpm nx build api`
- Start: `node apps/api/dist/main.js`
