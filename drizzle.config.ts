import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: 'apps/api/.env' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

export default defineConfig({
  schema: './apps/api/src/db/schema.ts',
  out: './apps/api/src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
