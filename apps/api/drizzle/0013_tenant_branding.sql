CREATE TABLE "tenant_logo_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"original_name" varchar(260) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"relative_path" varchar(500) NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_logo_versions_size_positive" CHECK ("tenant_logo_versions"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "tenant_branding" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"active_logo_version_id" uuid,
	"updated_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alimentacion_formato_emissions" ADD COLUMN "tenant_logo_version_id_snapshot" uuid;
--> statement-breakpoint
ALTER TABLE "tenant_logo_versions" ADD CONSTRAINT "tenant_logo_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_logo_versions" ADD CONSTRAINT "tenant_logo_versions_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_active_logo_version_id_tenant_logo_versions_id_fk" FOREIGN KEY ("active_logo_version_id") REFERENCES "public"."tenant_logo_versions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "alimentacion_formato_emissions" ADD CONSTRAINT "alimentacion_formato_emissions_tenant_logo_version_id_snapshot_tenant_logo_versions_id_fk" FOREIGN KEY ("tenant_logo_version_id_snapshot") REFERENCES "public"."tenant_logo_versions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "tenant_logo_versions_tenant_created_at_idx" ON "tenant_logo_versions" USING btree ("tenant_id", "created_at");
--> statement-breakpoint
CREATE INDEX "tenant_logo_versions_uploaded_by_user_idx" ON "tenant_logo_versions" USING btree ("uploaded_by_user_id");
--> statement-breakpoint
CREATE INDEX "tenant_branding_active_logo_version_idx" ON "tenant_branding" USING btree ("active_logo_version_id");
