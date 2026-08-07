CREATE TABLE "alimentacion_formato_imported_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"adulto_mayor_id" uuid NOT NULL,
	"delivery_month" varchar(7) NOT NULL,
	"version" integer NOT NULL,
	"source" varchar(20) DEFAULT 'importado' NOT NULL,
	"original_name" varchar(260) NOT NULL,
	"stored_name" varchar(260) NOT NULL,
	"pdf_relative_path" varchar(500) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"imported_by_user_id" uuid NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alimentacion_formato_imported_versions_size_positive" CHECK ("alimentacion_formato_imported_versions"."size_bytes" > 0)
);
--> statement-breakpoint
ALTER TABLE "alimentacion_formato_imported_versions" ADD CONSTRAINT "alimentacion_formato_imported_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alimentacion_formato_imported_versions" ADD CONSTRAINT "alimentacion_formato_imported_versions_adulto_mayor_id_adultos_mayores_id_fk" FOREIGN KEY ("adulto_mayor_id") REFERENCES "public"."adultos_mayores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alimentacion_formato_imported_versions" ADD CONSTRAINT "alimentacion_formato_imported_versions_imported_by_user_id_users_id_fk" FOREIGN KEY ("imported_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alimentacion_formato_imported_versions_unique_version" ON "alimentacion_formato_imported_versions" USING btree ("adulto_mayor_id","delivery_month","version");--> statement-breakpoint
CREATE INDEX "alimentacion_formato_imported_versions_tenant_month_idx" ON "alimentacion_formato_imported_versions" USING btree ("tenant_id","delivery_month");--> statement-breakpoint
CREATE INDEX "alimentacion_formato_imported_versions_adulto_mayor_idx" ON "alimentacion_formato_imported_versions" USING btree ("adulto_mayor_id");--> statement-breakpoint
CREATE INDEX "alimentacion_formato_imported_versions_imported_by_user_idx" ON "alimentacion_formato_imported_versions" USING btree ("imported_by_user_id");
