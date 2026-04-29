CREATE TABLE "atencion_individual_counters" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"last_value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "atenciones_individuales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"adulto_mayor_id" uuid NOT NULL,
	"attention_date" date NOT NULL,
	"modalidad" varchar(40) NOT NULL,
	"tipo_consulta" varchar(40) NOT NULL,
	"nombre_consulta" varchar(160) NOT NULL,
	"consecutive" integer NOT NULL,
	"finalidad" varchar(60) NOT NULL,
	"causa_externa" varchar(60) NOT NULL,
	"motivo_consulta" text NOT NULL,
	"enfermedad_actual" text NOT NULL,
	"antecedentes_personales" text,
	"antecedentes_familiares" text,
	"tension_sistolica" integer,
	"tension_diastolica" integer,
	"frecuencia_cardiaca" integer,
	"frecuencia_respiratoria" integer,
	"temperatura" double precision,
	"saturacion_oxigeno" integer,
	"peso_kg" double precision,
	"talla_cm" double precision,
	"imc" double precision,
	"perimetro_abdominal_cm" double precision,
	"examen_fisico" text,
	"resultados_laboratorios" text,
	"resultados_procedimientos" text,
	"ordenes_medicas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"diagnosticos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "atencion_individual_counters" ADD CONSTRAINT "atencion_individual_counters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "atenciones_individuales" ADD CONSTRAINT "atenciones_individuales_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "atenciones_individuales" ADD CONSTRAINT "atenciones_individuales_adulto_mayor_id_adultos_mayores_id_fk" FOREIGN KEY ("adulto_mayor_id") REFERENCES "public"."adultos_mayores"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "atenciones_individuales" ADD CONSTRAINT "atenciones_individuales_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "atenciones_individuales" ADD CONSTRAINT "atenciones_individuales_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "atencion_individual_counters_updated_at_idx" ON "atencion_individual_counters" USING btree ("updated_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "atenciones_individuales_tenant_consecutive_unique" ON "atenciones_individuales" USING btree ("tenant_id","consecutive");
--> statement-breakpoint
CREATE INDEX "atenciones_individuales_tenant_date_idx" ON "atenciones_individuales" USING btree ("tenant_id","attention_date");
--> statement-breakpoint
CREATE INDEX "atenciones_individuales_adulto_mayor_idx" ON "atenciones_individuales" USING btree ("adulto_mayor_id");
--> statement-breakpoint
CREATE INDEX "atenciones_individuales_created_by_user_idx" ON "atenciones_individuales" USING btree ("created_by_user_id");
--> statement-breakpoint
CREATE INDEX "atenciones_individuales_updated_by_user_idx" ON "atenciones_individuales" USING btree ("updated_by_user_id");
