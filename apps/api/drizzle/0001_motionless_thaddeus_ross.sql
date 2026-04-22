CREATE TYPE "public"."tenant_document_type" AS ENUM('nit', 'cc', 'ce');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" varchar(80) NOT NULL,
	"target_tenant_id" uuid,
	"target_user_id" uuid,
	"summary" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "tenants_slug_unique";--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "document_type" "tenant_document_type" DEFAULT 'nit' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "document_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "document_number" varchar(80);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "email" varchar(320);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "phone" varchar(40);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "address" varchar(220);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "department" varchar(100);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_tenant_id_tenants_id_fk" FOREIGN KEY ("target_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_target_tenant_id_idx" ON "audit_logs" USING btree ("target_tenant_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_document_unique" ON "tenants" USING btree ("document_type","document_number") WHERE "tenants"."document_number" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_email_unique" ON "tenants" USING btree ("email") WHERE "tenants"."email" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_owner_unique" ON "users" USING btree ("tenant_id") WHERE "users"."role" = 'tenant_admin' and "users"."tenant_id" is not null;--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN "slug";
