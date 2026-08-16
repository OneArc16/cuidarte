ALTER TYPE "public"."adulto_mayor_import_row_status" ADD VALUE IF NOT EXISTS 'update_ready';
ALTER TYPE "public"."adulto_mayor_import_row_status" ADD VALUE IF NOT EXISTS 'unchanged';

ALTER TABLE "adulto_mayor_import_batches"
  ADD COLUMN "update_rows" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "unchanged_rows" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "updated_rows" integer DEFAULT 0 NOT NULL;

ALTER TABLE "adulto_mayor_import_rows"
  ADD COLUMN "existing_adulto_updated_at" timestamp with time zone;

UPDATE "adulto_mayor_import_rows"
SET "status" = 'unchanged'
WHERE "status" = 'existing';

UPDATE "adulto_mayor_import_batches"
SET
  "unchanged_rows" = "existing_rows",
  "updated_rows" = 0
WHERE "existing_rows" > 0;

ALTER TABLE "adulto_mayor_import_batches"
  ADD CONSTRAINT "adulto_mayor_import_batches_update_rows_non_negative" CHECK ("adulto_mayor_import_batches"."update_rows" >= 0),
  ADD CONSTRAINT "adulto_mayor_import_batches_unchanged_rows_non_negative" CHECK ("adulto_mayor_import_batches"."unchanged_rows" >= 0),
  ADD CONSTRAINT "adulto_mayor_import_batches_updated_rows_non_negative" CHECK ("adulto_mayor_import_batches"."updated_rows" >= 0);
