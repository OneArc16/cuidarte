ALTER TYPE "public"."adulto_mayor_import_row_status" ADD VALUE IF NOT EXISTS 'update_ready';--> statement-breakpoint
ALTER TYPE "public"."adulto_mayor_import_row_status" ADD VALUE IF NOT EXISTS 'unchanged';--> statement-breakpoint
ALTER TYPE "public"."adulto_mayor_import_row_status" ADD VALUE IF NOT EXISTS 'existing';--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_batches" ADD COLUMN "update_rows" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_batches" ADD COLUMN "updated_rows" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_batches" ADD COLUMN "unchanged_rows" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_rows" ADD COLUMN "existing_adulto_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_batches" ADD CONSTRAINT "adulto_mayor_import_batches_update_rows_non_negative" CHECK ("update_rows" >= 0);--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_batches" ADD CONSTRAINT "adulto_mayor_import_batches_updated_rows_non_negative" CHECK ("updated_rows" >= 0);--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_batches" ADD CONSTRAINT "adulto_mayor_import_batches_unchanged_rows_non_negative" CHECK ("unchanged_rows" >= 0);
