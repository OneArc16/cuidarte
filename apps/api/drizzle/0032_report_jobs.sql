CREATE TYPE "public"."report_type" AS ENUM('ACTAS_SESIONES_GRUPALES', 'FORMATOS_ENTREGA_ALIMENTACION');
--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'processing', 'ready', 'empty', 'failed', 'cancelled', 'expired');
--> statement-breakpoint
CREATE TABLE "report_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "tenant_name" varchar(160) NOT NULL,
  "requested_by_user_id" uuid NOT NULL,
  "requested_by_role" "user_role" NOT NULL,
  "type" "report_type" NOT NULL,
  "period" varchar(7) NOT NULL,
  "status" "report_status" DEFAULT 'pending' NOT NULL,
  "total_documents" integer,
  "processed_documents" integer DEFAULT 0 NOT NULL,
  "failed_documents" integer DEFAULT 0 NOT NULL,
  "storage_key" varchar(500),
  "download_filename" varchar(260),
  "error_code" varchar(80),
  "expires_at" timestamp with time zone,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "report_jobs_period_format" CHECK ("report_jobs"."period" ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT "report_jobs_total_documents_non_negative" CHECK ("report_jobs"."total_documents" is null or "report_jobs"."total_documents" >= 0),
  CONSTRAINT "report_jobs_processed_documents_non_negative" CHECK ("report_jobs"."processed_documents" >= 0),
  CONSTRAINT "report_jobs_failed_documents_non_negative" CHECK ("report_jobs"."failed_documents" >= 0),
  CONSTRAINT "report_jobs_processed_not_greater_than_total" CHECK ("report_jobs"."total_documents" is null or "report_jobs"."processed_documents" <= "report_jobs"."total_documents")
);
--> statement-breakpoint
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "report_jobs_tenant_created_at_idx" ON "report_jobs" USING btree ("tenant_id","created_at");
--> statement-breakpoint
CREATE INDEX "report_jobs_status_expires_at_idx" ON "report_jobs" USING btree ("status","expires_at");
--> statement-breakpoint
CREATE INDEX "report_jobs_requested_by_user_idx" ON "report_jobs" USING btree ("requested_by_user_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "report_jobs_active_unique" ON "report_jobs" USING btree ("tenant_id","type","period") WHERE "report_jobs"."status" in ('pending', 'processing');
