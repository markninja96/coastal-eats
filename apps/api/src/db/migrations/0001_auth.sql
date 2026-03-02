ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_google_id" ON "users" ("google_id");
