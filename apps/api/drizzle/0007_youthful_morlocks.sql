CREATE TYPE "public"."alimentacion_organizer" AS ENUM('director', 'medico', 'enfermeria', 'psicologa', 'trabajadora_social', 'nutricionista', 'fisioterapeuta', 'recreacionista');--> statement-breakpoint
CREATE TYPE "public"."alimentacion_status" AS ENUM('entregado', 'no_entregado', 'no_aplica');--> statement-breakpoint
CREATE TABLE "alimentacion_registros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"adulto_mayor_id" uuid NOT NULL,
	"delivery_date" date NOT NULL,
	"organizer" "alimentacion_organizer" NOT NULL,
	"refrigerio_1" "alimentacion_status" NOT NULL,
	"almuerzo" "alimentacion_status" NOT NULL,
	"refrigerio_2" "alimentacion_status" NOT NULL,
	"auxilio_transporte" "alimentacion_status" NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alimentacion_registros" ADD CONSTRAINT "alimentacion_registros_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alimentacion_registros" ADD CONSTRAINT "alimentacion_registros_adulto_mayor_id_adultos_mayores_id_fk" FOREIGN KEY ("adulto_mayor_id") REFERENCES "public"."adultos_mayores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alimentacion_registros" ADD CONSTRAINT "alimentacion_registros_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alimentacion_registros" ADD CONSTRAINT "alimentacion_registros_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alimentacion_registros_tenant_adulto_fecha_unique" ON "alimentacion_registros" USING btree ("tenant_id","adulto_mayor_id","delivery_date");--> statement-breakpoint
CREATE INDEX "alimentacion_registros_tenant_date_idx" ON "alimentacion_registros" USING btree ("tenant_id","delivery_date");--> statement-breakpoint
CREATE INDEX "alimentacion_registros_adulto_mayor_idx" ON "alimentacion_registros" USING btree ("adulto_mayor_id");--> statement-breakpoint
CREATE INDEX "alimentacion_registros_created_by_user_idx" ON "alimentacion_registros" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "alimentacion_registros_updated_by_user_idx" ON "alimentacion_registros" USING btree ("updated_by_user_id");