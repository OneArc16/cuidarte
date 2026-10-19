CREATE TABLE "actividad_grupal_tipo_team_counters" (
	"activity_type_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"last_value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "actividad_grupal_tipo_team_counters_activity_type_id_team_id_pk" PRIMARY KEY("activity_type_id","team_id")
);
--> statement-breakpoint
DROP INDEX "actividades_grupales_tenant_acta_unique";--> statement-breakpoint
ALTER TABLE "actividad_grupal_tipos" ADD COLUMN "consecutive_mode" varchar(16) DEFAULT 'group' NOT NULL;--> statement-breakpoint
ALTER TABLE "actividad_grupal_tipo_team_counters" ADD CONSTRAINT "actividad_grupal_tipo_team_counters_activity_type_id_actividad_grupal_tipos_id_fk" FOREIGN KEY ("activity_type_id") REFERENCES "public"."actividad_grupal_tipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_grupal_tipo_team_counters" ADD CONSTRAINT "actividad_grupal_tipo_team_counters_team_id_employee_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."employee_teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actividad_grupal_tipo_team_counters_updated_at_idx" ON "actividad_grupal_tipo_team_counters" USING btree ("updated_at");--> statement-breakpoint
ALTER TABLE "actividad_grupal_tipos" ADD CONSTRAINT "actividad_grupal_tipos_consecutive_mode_valid" CHECK ("actividad_grupal_tipos"."consecutive_mode" in ('group', 'individual'));