ALTER TABLE "adultos_mayores"
ADD COLUMN "death_date" date;
--> statement-breakpoint
CREATE INDEX "adultos_mayores_tenant_status_death_date_idx"
ON "adultos_mayores" USING btree ("tenant_id", "status", "death_date");
--> statement-breakpoint
CREATE TABLE "adulto_mayor_historial_estados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adulto_mayor_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"previous_status" "adulto_mayor_status",
	"new_status" "adulto_mayor_status" NOT NULL,
	"previous_death_date" date,
	"new_death_date" date,
	"reason" varchar(500),
	"changed_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "adulto_mayor_historial_estados_adulto_mayor_id_adultos_mayores_id_fk" FOREIGN KEY ("adulto_mayor_id") REFERENCES "public"."adultos_mayores"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "adulto_mayor_historial_estados_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "adulto_mayor_historial_estados_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "adulto_mayor_historial_estados_adulto_created_at_idx"
ON "adulto_mayor_historial_estados" USING btree ("adulto_mayor_id", "created_at");
--> statement-breakpoint
CREATE INDEX "adulto_mayor_historial_estados_tenant_created_at_idx"
ON "adulto_mayor_historial_estados" USING btree ("tenant_id", "created_at");
