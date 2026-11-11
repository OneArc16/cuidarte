CREATE TYPE "public"."adulto_mayor_program_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "adulto_mayor_periodos_programa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adulto_mayor_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activation_date" date NOT NULL,
	"inactivation_date" date,
	"activation_reason" varchar(500),
	"inactivation_reason" varchar(500),
	"activated_by_user_id" uuid,
	"inactivated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "adulto_mayor_periodos_programa_valid_range" CHECK ("adulto_mayor_periodos_programa"."inactivation_date" is null or "adulto_mayor_periodos_programa"."inactivation_date" > "adulto_mayor_periodos_programa"."activation_date")
);
--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "program_status" "adulto_mayor_program_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "adulto_mayor_periodos_programa" ADD CONSTRAINT "adulto_mayor_periodos_programa_adulto_mayor_id_adultos_mayores_id_fk" FOREIGN KEY ("adulto_mayor_id") REFERENCES "public"."adultos_mayores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adulto_mayor_periodos_programa" ADD CONSTRAINT "adulto_mayor_periodos_programa_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adulto_mayor_periodos_programa" ADD CONSTRAINT "adulto_mayor_periodos_programa_activated_by_user_id_users_id_fk" FOREIGN KEY ("activated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adulto_mayor_periodos_programa" ADD CONSTRAINT "adulto_mayor_periodos_programa_inactivated_by_user_id_users_id_fk" FOREIGN KEY ("inactivated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "adulto_mayor_periodos_programa_open_unique" ON "adulto_mayor_periodos_programa" USING btree ("adulto_mayor_id") WHERE "adulto_mayor_periodos_programa"."inactivation_date" is null;--> statement-breakpoint
CREATE INDEX "adulto_mayor_periodos_programa_adulto_activation_idx" ON "adulto_mayor_periodos_programa" USING btree ("adulto_mayor_id","activation_date");--> statement-breakpoint
CREATE INDEX "adulto_mayor_periodos_programa_tenant_idx" ON "adulto_mayor_periodos_programa" USING btree ("tenant_id");--> statement-breakpoint
INSERT INTO "adulto_mayor_periodos_programa"
("adulto_mayor_id", "tenant_id", "activation_date", "inactivation_date")
SELECT
  "id",
  "tenant_id",
  DATE '2026-07-15',
  CASE
    WHEN "status"::text = 'deceased' THEN "death_date"
    ELSE NULL
  END
FROM "adultos_mayores"
WHERE "birth_date" <= DATE '2026-07-15'
  AND (
    "status"::text <> 'deceased'
    OR "death_date" > DATE '2026-07-15'
  );--> statement-breakpoint
UPDATE "adultos_mayores"
SET "program_status" = 'inactive'
WHERE "status"::text = 'deceased'
   OR "birth_date" > DATE '2026-07-15';
