CREATE TYPE "public"."trabajo_social_session_modality" AS ENUM('individual', 'familiar');
--> statement-breakpoint
CREATE TABLE "trabajo_social_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
  "adulto_mayor_id" uuid NOT NULL REFERENCES "adultos_mayores"("id") ON DELETE RESTRICT,
  "session_date" date NOT NULL,
  "modality" "trabajo_social_session_modality" DEFAULT 'individual' NOT NULL,
  "reason" text NOT NULL,
  "social_assessment" text NOT NULL,
  "intervention" text NOT NULL,
  "agreements" text,
  "next_session_date" date,
  "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "updated_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "trabajo_social_sessions_next_after_session" CHECK ("next_session_date" is null or "next_session_date" >= "session_date"),
  CONSTRAINT "trabajo_social_sessions_reason_length" CHECK (char_length(btrim("reason")) between 1 and 2000),
  CONSTRAINT "trabajo_social_sessions_assessment_length" CHECK (char_length(btrim("social_assessment")) between 1 and 4000),
  CONSTRAINT "trabajo_social_sessions_intervention_length" CHECK (char_length(btrim("intervention")) between 1 and 4000),
  CONSTRAINT "trabajo_social_sessions_agreements_length" CHECK ("agreements" is null or char_length("agreements") <= 4000),
  CONSTRAINT "trabajo_social_sessions_version_positive" CHECK ("version" > 0)
);
--> statement-breakpoint
CREATE INDEX "trabajo_social_sessions_tenant_date_idx" ON "trabajo_social_sessions" USING btree ("tenant_id", "session_date");
--> statement-breakpoint
CREATE INDEX "trabajo_social_sessions_adulto_date_idx" ON "trabajo_social_sessions" USING btree ("adulto_mayor_id", "session_date");
--> statement-breakpoint
CREATE INDEX "trabajo_social_sessions_created_by_user_idx" ON "trabajo_social_sessions" USING btree ("created_by_user_id");
--> statement-breakpoint
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'trabajo_social.view' FROM "users" WHERE "role"::text IN ('super_admin', 'admin', 'auditor', 'director', 'trabajadora_social') ON CONFLICT ("user_id", "permission") DO NOTHING;
--> statement-breakpoint
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'trabajo_social.create' FROM "users" WHERE "role"::text IN ('super_admin', 'admin', 'director', 'trabajadora_social') ON CONFLICT ("user_id", "permission") DO NOTHING;
--> statement-breakpoint
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'trabajo_social.edit_own' FROM "users" WHERE "role"::text IN ('super_admin', 'admin', 'director', 'trabajadora_social') ON CONFLICT ("user_id", "permission") DO NOTHING;
--> statement-breakpoint
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'trabajo_social.manage' FROM "users" WHERE "role"::text IN ('super_admin', 'admin', 'director') ON CONFLICT ("user_id", "permission") DO NOTHING;
