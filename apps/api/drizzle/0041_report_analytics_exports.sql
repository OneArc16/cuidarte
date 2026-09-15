CREATE TYPE "public"."report_analytics_export_format" AS ENUM ('xlsx', 'pdf', 'pptx');
CREATE TYPE "public"."report_analytics_export_status" AS ENUM ('pending', 'processing', 'ready', 'failed', 'cancelled', 'expired');
CREATE TABLE "report_analytics_exports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE restrict,
  "tenant_name" varchar(160),
  "requested_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE restrict,
  "requested_by_role" "user_role" NOT NULL,
  "format" "report_analytics_export_format" NOT NULL,
  "from" date NOT NULL,
  "to" date NOT NULL,
  "status" "report_analytics_export_status" DEFAULT 'pending' NOT NULL,
  "progress" integer DEFAULT 0 NOT NULL,
  "storage_key" varchar(500),
  "download_filename" varchar(260),
  "error_message" text,
  "expires_at" timestamptz,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "report_analytics_exports_progress_range" CHECK ("report_analytics_exports"."progress" between 0 and 100)
);
CREATE INDEX "report_analytics_exports_tenant_created_idx" ON "report_analytics_exports" USING btree ("tenant_id", "created_at");
CREATE INDEX "report_analytics_exports_status_created_idx" ON "report_analytics_exports" USING btree ("status", "created_at");
