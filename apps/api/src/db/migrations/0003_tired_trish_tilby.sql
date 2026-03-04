UPDATE "shifts"
SET "required_skill_id" = (
  SELECT "id" FROM "skills" ORDER BY "created_at" LIMIT 1
)
WHERE "required_skill_id" IS NULL;

ALTER TABLE "shifts" ALTER COLUMN "required_skill_id" SET NOT NULL;
