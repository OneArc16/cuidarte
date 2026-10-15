CREATE TABLE "actividad_grupal_global_series" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"prefix" varchar(24),
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "actividad_grupal_global_series_singleton" CHECK ("actividad_grupal_global_series"."id" = 1),
	CONSTRAINT "actividad_grupal_global_series_config_complete" CHECK (("actividad_grupal_global_series"."enabled" = false and "actividad_grupal_global_series"."prefix" is null) or ("actividad_grupal_global_series"."enabled" = true and "actividad_grupal_global_series"."prefix" is not null))
);
--> statement-breakpoint
CREATE TABLE "actividad_grupal_global_series_counters" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"last_value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actividad_grupal_global_series" ADD CONSTRAINT "actividad_grupal_global_series_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_grupal_global_series_counters" ADD CONSTRAINT "actividad_grupal_global_series_counters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;