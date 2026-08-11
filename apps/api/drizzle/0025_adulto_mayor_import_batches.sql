CREATE TYPE "public"."adulto_mayor_import_status" AS ENUM('ready', 'validated_with_errors', 'committing', 'completed', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."adulto_mayor_import_row_status" AS ENUM('ready', 'invalid', 'existing');--> statement-breakpoint
CREATE TYPE "public"."adulto_mayor_import_issue_severity" AS ENUM('error', 'warning');--> statement-breakpoint
CREATE TABLE "adulto_mayor_import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"original_filename" varchar(260) NOT NULL,
	"file_checksum_sha256" varchar(64) NOT NULL,
	"template_version" integer NOT NULL,
	"status" "adulto_mayor_import_status" NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"ready_rows" integer DEFAULT 0 NOT NULL,
	"invalid_rows" integer DEFAULT 0 NOT NULL,
	"warning_rows" integer DEFAULT 0 NOT NULL,
	"existing_rows" integer DEFAULT 0 NOT NULL,
	"created_rows" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"failure_code" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adulto_mayor_import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_batch_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"status" "adulto_mayor_import_row_status" NOT NULL,
	"normalized_payload" jsonb,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"existing_adulto_id" uuid,
	"created_adulto_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_batches" ADD CONSTRAINT "adulto_mayor_import_batches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_batches" ADD CONSTRAINT "adulto_mayor_import_batches_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_rows" ADD CONSTRAINT "adulto_mayor_import_rows_import_batch_id_adulto_mayor_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."adulto_mayor_import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_rows" ADD CONSTRAINT "adulto_mayor_import_rows_existing_adulto_id_adultos_mayores_id_fk" FOREIGN KEY ("existing_adulto_id") REFERENCES "public"."adultos_mayores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_rows" ADD CONSTRAINT "adulto_mayor_import_rows_created_adulto_id_adultos_mayores_id_fk" FOREIGN KEY ("created_adulto_id") REFERENCES "public"."adultos_mayores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "adulto_mayor_import_batches_tenant_created_at_idx" ON "adulto_mayor_import_batches" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "adulto_mayor_import_batches_requested_by_user_idx" ON "adulto_mayor_import_batches" USING btree ("requested_by_user_id","created_at");--> statement-breakpoint
CREATE INDEX "adulto_mayor_import_batches_status_expires_at_idx" ON "adulto_mayor_import_batches" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "adulto_mayor_import_batches_checksum_idx" ON "adulto_mayor_import_batches" USING btree ("file_checksum_sha256");--> statement-breakpoint
CREATE INDEX "adulto_mayor_import_rows_batch_status_idx" ON "adulto_mayor_import_rows" USING btree ("import_batch_id","status");--> statement-breakpoint
CREATE INDEX "adulto_mayor_import_rows_existing_adulto_idx" ON "adulto_mayor_import_rows" USING btree ("existing_adulto_id");--> statement-breakpoint
CREATE INDEX "adulto_mayor_import_rows_created_adulto_idx" ON "adulto_mayor_import_rows" USING btree ("created_adulto_id");--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_batches" ADD CONSTRAINT "adulto_mayor_import_batches_total_rows_non_negative" CHECK ("total_rows" >= 0);--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_batches" ADD CONSTRAINT "adulto_mayor_import_batches_ready_rows_non_negative" CHECK ("ready_rows" >= 0);--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_batches" ADD CONSTRAINT "adulto_mayor_import_batches_invalid_rows_non_negative" CHECK ("invalid_rows" >= 0);--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_batches" ADD CONSTRAINT "adulto_mayor_import_batches_warning_rows_non_negative" CHECK ("warning_rows" >= 0);--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_batches" ADD CONSTRAINT "adulto_mayor_import_batches_existing_rows_non_negative" CHECK ("existing_rows" >= 0);--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_batches" ADD CONSTRAINT "adulto_mayor_import_batches_created_rows_non_negative" CHECK ("created_rows" >= 0);--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_batches" ADD CONSTRAINT "adulto_mayor_import_batches_template_version_positive" CHECK ("template_version" > 0);--> statement-breakpoint
ALTER TABLE "adulto_mayor_import_rows" ADD CONSTRAINT "adulto_mayor_import_rows_row_number_positive" CHECK ("row_number" > 0);--> statement-breakpoint
