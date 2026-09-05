CREATE TYPE "public"."atencion_enfermeria_care_type" AS ENUM(
	'control_signos_vitales',
	'seguimiento',
	'procedimiento',
	'otro'
);
--> statement-breakpoint
CREATE TYPE "public"."atencion_enfermeria_glucometria_context" AS ENUM(
	'ayunas',
	'antes_de_comida',
	'despues_de_comida',
	'aleatoria'
);
--> statement-breakpoint
CREATE TABLE "atenciones_enfermeria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"adulto_mayor_id" uuid NOT NULL,
	"attention_date" date NOT NULL,
	"attention_time" time(0) without time zone NOT NULL,
	"care_type" "atencion_enfermeria_care_type" NOT NULL,
	"reason" text,
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
	"glucometria_mg_dl" integer,
	"glucometria_context" "atencion_enfermeria_glucometria_context",
	"nursing_note" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "atenciones_enfermeria_has_measurement" CHECK (
		"tension_sistolica" IS NOT NULL
		OR "tension_diastolica" IS NOT NULL
		OR "frecuencia_cardiaca" IS NOT NULL
		OR "frecuencia_respiratoria" IS NOT NULL
		OR "temperatura" IS NOT NULL
		OR "saturacion_oxigeno" IS NOT NULL
		OR "peso_kg" IS NOT NULL
		OR "talla_cm" IS NOT NULL
		OR "perimetro_abdominal_cm" IS NOT NULL
		OR "glucometria_mg_dl" IS NOT NULL
	),
	CONSTRAINT "atenciones_enfermeria_glucometria_pair" CHECK (
		("glucometria_mg_dl" IS NULL AND "glucometria_context" IS NULL)
		OR ("glucometria_mg_dl" IS NOT NULL AND "glucometria_context" IS NOT NULL)
	),
	CONSTRAINT "atenciones_enfermeria_measurements_range" CHECK (
		("tension_sistolica" IS NULL OR "tension_sistolica" BETWEEN 0 AND 999999)
		AND ("tension_diastolica" IS NULL OR "tension_diastolica" BETWEEN 0 AND 999999)
		AND ("frecuencia_cardiaca" IS NULL OR "frecuencia_cardiaca" BETWEEN 0 AND 999999)
		AND ("frecuencia_respiratoria" IS NULL OR "frecuencia_respiratoria" BETWEEN 0 AND 999999)
		AND ("temperatura" IS NULL OR "temperatura" BETWEEN 0 AND 999999)
		AND ("saturacion_oxigeno" IS NULL OR "saturacion_oxigeno" BETWEEN 0 AND 999999)
		AND ("peso_kg" IS NULL OR "peso_kg" BETWEEN 0 AND 999999)
		AND ("talla_cm" IS NULL OR "talla_cm" BETWEEN 0 AND 999999)
		AND ("imc" IS NULL OR "imc" BETWEEN 0 AND 999999)
		AND ("perimetro_abdominal_cm" IS NULL OR "perimetro_abdominal_cm" BETWEEN 0 AND 999999)
	),
	CONSTRAINT "atenciones_enfermeria_glucometria_range" CHECK (
		"glucometria_mg_dl" IS NULL OR "glucometria_mg_dl" BETWEEN 20 AND 600
	),
	CONSTRAINT "atenciones_enfermeria_reason_length" CHECK (
		"reason" IS NULL OR char_length("reason") <= 1000
	),
	CONSTRAINT "atenciones_enfermeria_nursing_note_length" CHECK (
		char_length(btrim("nursing_note")) BETWEEN 1 AND 4000
	),
	CONSTRAINT "atenciones_enfermeria_version_positive" CHECK ("version" > 0)
);
--> statement-breakpoint
ALTER TABLE "atenciones_enfermeria"
	ADD CONSTRAINT "atenciones_enfermeria_tenant_id_tenants_id_fk"
	FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "atenciones_enfermeria"
	ADD CONSTRAINT "atenciones_enfermeria_adulto_mayor_id_adultos_mayores_id_fk"
	FOREIGN KEY ("adulto_mayor_id") REFERENCES "public"."adultos_mayores"("id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "atenciones_enfermeria"
	ADD CONSTRAINT "atenciones_enfermeria_created_by_user_id_users_id_fk"
	FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "atenciones_enfermeria"
	ADD CONSTRAINT "atenciones_enfermeria_updated_by_user_id_users_id_fk"
	FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "atenciones_enfermeria_tenant_date_idx"
	ON "atenciones_enfermeria" USING btree ("tenant_id", "attention_date");
--> statement-breakpoint
CREATE INDEX "atenciones_enfermeria_adulto_date_idx"
	ON "atenciones_enfermeria" USING btree ("adulto_mayor_id", "attention_date");
--> statement-breakpoint
CREATE INDEX "atenciones_enfermeria_created_by_date_idx"
	ON "atenciones_enfermeria" USING btree ("created_by_user_id", "attention_date");
--> statement-breakpoint
CREATE INDEX "atenciones_enfermeria_tenant_updated_at_idx"
	ON "atenciones_enfermeria" USING btree ("tenant_id", "updated_at");
