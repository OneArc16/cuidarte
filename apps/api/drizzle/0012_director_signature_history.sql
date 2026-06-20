CREATE TABLE "employee_signature_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"original_name" varchar(260) NOT NULL,
	"mime_type" varchar(160) NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"relative_path" varchar(500) NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_director_signature_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"signature_version_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alimentacion_formato_emissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"adulto_mayor_id" uuid NOT NULL,
	"delivery_month" varchar(7) NOT NULL,
	"version" integer NOT NULL,
	"signer_employee_id_snapshot" uuid NOT NULL,
	"signer_name_snapshot" varchar(180) NOT NULL,
	"signer_role_snapshot" varchar(80) NOT NULL,
	"signature_version_id_snapshot" uuid NOT NULL,
	"filename" varchar(260) NOT NULL,
	"pdf_relative_path" varchar(500) NOT NULL,
	"source_record_count" integer NOT NULL,
	"source_date_from" date,
	"source_date_to" date,
	"issued_by_user_id" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_signature_versions" ADD CONSTRAINT "employee_signature_versions_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "employee_signature_versions" ADD CONSTRAINT "employee_signature_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "employee_signature_versions" ADD CONSTRAINT "employee_signature_versions_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_director_signature_assignments" ADD CONSTRAINT "tenant_director_signature_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_director_signature_assignments" ADD CONSTRAINT "tenant_director_signature_assignments_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_director_signature_assignments" ADD CONSTRAINT "tenant_director_signature_assignments_signature_version_id_employee_signature_versions_id_fk" FOREIGN KEY ("signature_version_id") REFERENCES "public"."employee_signature_versions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_director_signature_assignments" ADD CONSTRAINT "tenant_director_signature_assignments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "alimentacion_formato_emissions" ADD CONSTRAINT "alimentacion_formato_emissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "alimentacion_formato_emissions" ADD CONSTRAINT "alimentacion_formato_emissions_adulto_mayor_id_adultos_mayores_id_fk" FOREIGN KEY ("adulto_mayor_id") REFERENCES "public"."adultos_mayores"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "alimentacion_formato_emissions" ADD CONSTRAINT "alimentacion_formato_emissions_signer_employee_id_snapshot_users_id_fk" FOREIGN KEY ("signer_employee_id_snapshot") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "alimentacion_formato_emissions" ADD CONSTRAINT "alimentacion_formato_emissions_signature_version_id_snapshot_employee_signature_versions_id_fk" FOREIGN KEY ("signature_version_id_snapshot") REFERENCES "public"."employee_signature_versions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "alimentacion_formato_emissions" ADD CONSTRAINT "alimentacion_formato_emissions_issued_by_user_id_users_id_fk" FOREIGN KEY ("issued_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "employee_signature_versions_employee_idx" ON "employee_signature_versions" USING btree ("employee_id");
--> statement-breakpoint
CREATE INDEX "employee_signature_versions_tenant_idx" ON "employee_signature_versions" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "employee_signature_versions_uploaded_by_user_idx" ON "employee_signature_versions" USING btree ("uploaded_by_user_id");
--> statement-breakpoint
CREATE INDEX "employee_signature_versions_created_at_idx" ON "employee_signature_versions" USING btree ("created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_director_signature_assignments_active_unique" ON "tenant_director_signature_assignments" USING btree ("tenant_id") WHERE "tenant_director_signature_assignments"."effective_to" is null;
--> statement-breakpoint
CREATE INDEX "tenant_director_signature_assignments_tenant_idx" ON "tenant_director_signature_assignments" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "tenant_director_signature_assignments_employee_idx" ON "tenant_director_signature_assignments" USING btree ("employee_id");
--> statement-breakpoint
CREATE INDEX "tenant_director_signature_assignments_signature_version_idx" ON "tenant_director_signature_assignments" USING btree ("signature_version_id");
--> statement-breakpoint
CREATE INDEX "tenant_director_signature_assignments_effective_from_idx" ON "tenant_director_signature_assignments" USING btree ("effective_from");
--> statement-breakpoint
CREATE UNIQUE INDEX "alimentacion_formato_emissions_unique_version" ON "alimentacion_formato_emissions" USING btree ("adulto_mayor_id","delivery_month","version");
--> statement-breakpoint
CREATE INDEX "alimentacion_formato_emissions_tenant_month_idx" ON "alimentacion_formato_emissions" USING btree ("tenant_id","delivery_month");
--> statement-breakpoint
CREATE INDEX "alimentacion_formato_emissions_adulto_mayor_idx" ON "alimentacion_formato_emissions" USING btree ("adulto_mayor_id");
--> statement-breakpoint
CREATE INDEX "alimentacion_formato_emissions_signer_employee_idx" ON "alimentacion_formato_emissions" USING btree ("signer_employee_id_snapshot");
--> statement-breakpoint
CREATE INDEX "alimentacion_formato_emissions_issued_at_idx" ON "alimentacion_formato_emissions" USING btree ("issued_at");
