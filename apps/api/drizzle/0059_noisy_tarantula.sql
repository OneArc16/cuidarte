DROP INDEX "report_jobs_active_unique";--> statement-breakpoint
ALTER TABLE "report_jobs" ADD COLUMN "filter_key" varchar(240) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "report_jobs" ADD COLUMN "activity_search" varchar(120);--> statement-breakpoint
ALTER TABLE "report_jobs" ADD COLUMN "activity_type_id" uuid;--> statement-breakpoint
ALTER TABLE "report_jobs" ADD COLUMN "activity_organizer" "actividad_grupal_organizer";--> statement-breakpoint
CREATE UNIQUE INDEX "report_jobs_active_unique" ON "report_jobs" USING btree ("tenant_id","type","period","filter_key") WHERE "report_jobs"."status" in ('pending', 'processing');