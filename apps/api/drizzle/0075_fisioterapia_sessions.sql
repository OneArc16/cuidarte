CREATE TYPE "public"."fisioterapia_session_modality" AS ENUM('individual', 'grupal', 'domiciliaria');
--> statement-breakpoint
CREATE TABLE "fisioterapia_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
  "adulto_mayor_id" uuid NOT NULL REFERENCES "adultos_mayores"("id") ON DELETE RESTRICT,
  "session_date" date NOT NULL,
  "modality" "fisioterapia_session_modality" DEFAULT 'individual' NOT NULL,
  "reason" text NOT NULL,
  "functional_assessment" text NOT NULL,
  "intervention" text NOT NULL,
  "evolution" text,
  "next_session_date" date,
  "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "updated_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "fisioterapia_sessions_next_after_session" CHECK ("next_session_date" is null or "next_session_date" >= "session_date"),
  CONSTRAINT "fisioterapia_sessions_reason_length" CHECK (char_length(btrim("reason")) between 1 and 2000),
  CONSTRAINT "fisioterapia_sessions_functional_assessment_length" CHECK (char_length(btrim("functional_assessment")) between 1 and 4000),
  CONSTRAINT "fisioterapia_sessions_intervention_length" CHECK (char_length(btrim("intervention")) between 1 and 4000),
  CONSTRAINT "fisioterapia_sessions_evolution_length" CHECK ("evolution" is null or char_length("evolution") <= 4000),
  CONSTRAINT "fisioterapia_sessions_version_positive" CHECK ("version" > 0)
);
--> statement-breakpoint
CREATE INDEX "fisioterapia_sessions_tenant_date_idx" ON "fisioterapia_sessions" USING btree ("tenant_id", "session_date");
--> statement-breakpoint
CREATE INDEX "fisioterapia_sessions_adulto_date_idx" ON "fisioterapia_sessions" USING btree ("adulto_mayor_id", "session_date");
--> statement-breakpoint
CREATE INDEX "fisioterapia_sessions_created_by_user_idx" ON "fisioterapia_sessions" USING btree ("created_by_user_id");
