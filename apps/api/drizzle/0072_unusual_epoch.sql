CREATE TYPE "public"."nutricion_followup_adherence" AS ENUM('alta', 'media', 'baja', 'sin_dato');--> statement-breakpoint
CREATE TYPE "public"."nutricion_meal_slot" AS ENUM('desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'cena', 'colacion_nocturna');--> statement-breakpoint
CREATE TYPE "public"."nutricion_plan_status" AS ENUM('active', 'completed', 'archived');--> statement-breakpoint
CREATE TABLE "nutricion_followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"follow_up_date" date NOT NULL,
	"weight_kg" double precision,
	"height_cm" double precision,
	"body_mass_index" double precision,
	"abdominal_perimeter_cm" double precision,
	"adherence" "nutricion_followup_adherence" DEFAULT 'sin_dato' NOT NULL,
	"progress_note" text NOT NULL,
	"adjustments" text,
	"next_follow_up_date" date,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nutricion_followups_weight_range" CHECK ("nutricion_followups"."weight_kg" is null or "nutricion_followups"."weight_kg" between 10 and 400),
	CONSTRAINT "nutricion_followups_height_range" CHECK ("nutricion_followups"."height_cm" is null or "nutricion_followups"."height_cm" between 50 and 260),
	CONSTRAINT "nutricion_followups_bmi_range" CHECK ("nutricion_followups"."body_mass_index" is null or "nutricion_followups"."body_mass_index" between 1 and 200),
	CONSTRAINT "nutricion_followups_abdominal_perimeter_range" CHECK ("nutricion_followups"."abdominal_perimeter_cm" is null or "nutricion_followups"."abdominal_perimeter_cm" between 20 and 250),
	CONSTRAINT "nutricion_followups_progress_note_length" CHECK (char_length(btrim("nutricion_followups"."progress_note")) between 1 and 4000),
	CONSTRAINT "nutricion_followups_adjustments_length" CHECK ("nutricion_followups"."adjustments" is null or char_length("nutricion_followups"."adjustments") <= 4000),
	CONSTRAINT "nutricion_followups_version_positive" CHECK ("nutricion_followups"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "nutricion_plan_meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"slot" "nutricion_meal_slot" NOT NULL,
	"instruction" text NOT NULL,
	"portion" varchar(300),
	"frequency" varchar(300),
	"sort_order" integer NOT NULL,
	CONSTRAINT "nutricion_plan_meals_instruction_length" CHECK (char_length(btrim("nutricion_plan_meals"."instruction")) between 1 and 2000),
	CONSTRAINT "nutricion_plan_meals_sort_order_non_negative" CHECK ("nutricion_plan_meals"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "nutricion_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"adulto_mayor_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"next_follow_up_date" date,
	"status" "nutricion_plan_status" DEFAULT 'active' NOT NULL,
	"assessment" text NOT NULL,
	"goal" text NOT NULL,
	"recommendations" text NOT NULL,
	"restrictions" text,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nutricion_plans_next_follow_up_after_start" CHECK ("nutricion_plans"."next_follow_up_date" is null or "nutricion_plans"."next_follow_up_date" >= "nutricion_plans"."start_date"),
	CONSTRAINT "nutricion_plans_assessment_length" CHECK (char_length(btrim("nutricion_plans"."assessment")) between 1 and 4000),
	CONSTRAINT "nutricion_plans_goal_length" CHECK (char_length(btrim("nutricion_plans"."goal")) between 1 and 1500),
	CONSTRAINT "nutricion_plans_recommendations_length" CHECK (char_length(btrim("nutricion_plans"."recommendations")) between 1 and 4000),
	CONSTRAINT "nutricion_plans_restrictions_length" CHECK ("nutricion_plans"."restrictions" is null or char_length("nutricion_plans"."restrictions") <= 2000),
	CONSTRAINT "nutricion_plans_version_positive" CHECK ("nutricion_plans"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "nutricion_followups" ADD CONSTRAINT "nutricion_followups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutricion_followups" ADD CONSTRAINT "nutricion_followups_plan_id_nutricion_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."nutricion_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutricion_followups" ADD CONSTRAINT "nutricion_followups_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutricion_followups" ADD CONSTRAINT "nutricion_followups_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutricion_plan_meals" ADD CONSTRAINT "nutricion_plan_meals_plan_id_nutricion_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."nutricion_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutricion_plans" ADD CONSTRAINT "nutricion_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutricion_plans" ADD CONSTRAINT "nutricion_plans_adulto_mayor_id_adultos_mayores_id_fk" FOREIGN KEY ("adulto_mayor_id") REFERENCES "public"."adultos_mayores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutricion_plans" ADD CONSTRAINT "nutricion_plans_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutricion_plans" ADD CONSTRAINT "nutricion_plans_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nutricion_followups_tenant_date_idx" ON "nutricion_followups" USING btree ("tenant_id","follow_up_date");--> statement-breakpoint
CREATE INDEX "nutricion_followups_plan_date_idx" ON "nutricion_followups" USING btree ("plan_id","follow_up_date");--> statement-breakpoint
CREATE INDEX "nutricion_followups_created_by_user_idx" ON "nutricion_followups" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nutricion_plan_meals_plan_slot_unique" ON "nutricion_plan_meals" USING btree ("plan_id","slot");--> statement-breakpoint
CREATE INDEX "nutricion_plan_meals_plan_sort_idx" ON "nutricion_plan_meals" USING btree ("plan_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "nutricion_plans_one_active_per_adulto_unique" ON "nutricion_plans" USING btree ("adulto_mayor_id") WHERE "nutricion_plans"."status" = 'active';--> statement-breakpoint
CREATE INDEX "nutricion_plans_tenant_status_idx" ON "nutricion_plans" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "nutricion_plans_adulto_start_date_idx" ON "nutricion_plans" USING btree ("adulto_mayor_id","start_date");--> statement-breakpoint
CREATE INDEX "nutricion_plans_created_by_user_idx" ON "nutricion_plans" USING btree ("created_by_user_id");--> statement-breakpoint
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'nutricion.view'
FROM "users"
WHERE "role"::text IN ('super_admin', 'admin', 'auditor', 'director', 'nutricionista')
ON CONFLICT ("user_id", "permission") DO NOTHING;--> statement-breakpoint
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'nutricion.create'
FROM "users"
WHERE "role"::text IN ('super_admin', 'admin', 'director', 'nutricionista')
ON CONFLICT ("user_id", "permission") DO NOTHING;--> statement-breakpoint
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'nutricion.edit_own'
FROM "users"
WHERE "role"::text IN ('super_admin', 'admin', 'director', 'nutricionista')
ON CONFLICT ("user_id", "permission") DO NOTHING;--> statement-breakpoint
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'nutricion.manage'
FROM "users"
WHERE "role"::text IN ('super_admin', 'admin', 'director')
ON CONFLICT ("user_id", "permission") DO NOTHING;
