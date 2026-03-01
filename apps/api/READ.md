# API Notes

Quick notes for the Nest API app.

## Environment

- Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL`.

## Database (Drizzle)

- Generate migration: `pnpm db:generate --name init`
- Apply schema: `pnpm db:push`
- Seed data: `pnpm db:seed`
- Open Drizzle Studio: `pnpm db:studio`

Note: Drizzle config reads `DATABASE_URL` from the environment.

## Run locally

- `pnpm nx serve api`

## Deployment (Render)

- Build: `pnpm install --frozen-lockfile && pnpm nx build api`
- Start: `node apps/api/dist/main.js`
