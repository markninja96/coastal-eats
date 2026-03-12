UPDATE "shifts"
SET "required_skill_id" = (
  SELECT "id" FROM "skills" ORDER BY "created_at", "id" LIMIT 1
)
WHERE "required_skill_id" IS NULL
  AND EXISTS (SELECT 1 FROM "skills");

ALTER TABLE "shifts" ALTER COLUMN "required_skill_id" SET NOT NULL;
