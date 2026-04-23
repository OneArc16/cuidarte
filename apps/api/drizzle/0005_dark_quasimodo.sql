CREATE TYPE "public"."actividad_grupal_organizer" AS ENUM('director', 'medico', 'enfermeria', 'psicologa', 'trabajadora_social', 'nutricionista', 'fisioterapeuta', 'recreacionista');--> statement-breakpoint
CREATE TYPE "public"."actividad_grupal_type" AS ENUM('centro_vida', 'actividad_campo', 'sesiones_psicosocial', 'salud_preventiva', 'nutricion', 'fisioterapia', 'encuentro_intergeneracional', 'actividades_manualidad', 'actividades_recreacion');--> statement-breakpoint
CREATE TABLE "actividad_grupal_acta_counters" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"last_value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "actividad_grupal_empleados" (
	"activity_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	CONSTRAINT "actividad_grupal_empleados_pk" PRIMARY KEY("activity_id","employee_id")
);
--> statement-breakpoint
CREATE TABLE "actividades_grupales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"acta_number" integer NOT NULL,
	"activity_name" varchar(160) NOT NULL,
	"activity_type" "actividad_grupal_type" NOT NULL,
	"activity_date" date NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"organizer" "actividad_grupal_organizer" NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actividad_grupal_acta_counters" ADD CONSTRAINT "actividad_grupal_acta_counters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_grupal_empleados" ADD CONSTRAINT "actividad_grupal_empleados_activity_id_actividades_grupales_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."actividades_grupales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_grupal_empleados" ADD CONSTRAINT "actividad_grupal_empleados_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividades_grupales" ADD CONSTRAINT "actividades_grupales_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividades_grupales" ADD CONSTRAINT "actividades_grupales_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actividad_grupal_acta_counters_updated_at_idx" ON "actividad_grupal_acta_counters" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "actividad_grupal_empleados_employee_idx" ON "actividad_grupal_empleados" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "actividades_grupales_tenant_acta_unique" ON "actividades_grupales" USING btree ("tenant_id","acta_number");--> statement-breakpoint
CREATE INDEX "actividades_grupales_tenant_date_idx" ON "actividades_grupales" USING btree ("tenant_id","activity_date");--> statement-breakpoint
CREATE INDEX "actividades_grupales_created_by_user_idx" ON "actividades_grupales" USING btree ("created_by_user_id");