ALTER TABLE "report_jobs" DROP CONSTRAINT "report_jobs_period_format";
--> statement-breakpoint
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_period_format" CHECK ("report_jobs"."period" = 'ALL' OR "report_jobs"."period" ~ '^\d{4}-(0[1-9]|1[0-2])$');
