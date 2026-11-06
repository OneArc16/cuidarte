ALTER TABLE "audit_logs" ADD COLUMN "actor_ip" varchar(64);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_user_agent" text;