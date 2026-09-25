CREATE TABLE "alimentacion_bulk_import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"mode" varchar(12) NOT NULL,
	"delivery_month" varchar(7),
	"status" varchar(20) DEFAULT 'validated' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alimentacion_bulk_import_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"original_name" varchar(260) NOT NULL,
	"document_number" varchar(80),
	"normalized_document_number" varchar(80),
	"delivery_month" varchar(7),
	"adulto_mayor_id" uuid,
	"adulto_mayor_full_name" varchar(360),
	"sha256" varchar(64) NOT NULL,
	"size_bytes" integer NOT NULL,
	"staged_relative_path" varchar(500) NOT NULL,
	"status" varchar(20) NOT NULL,
	"reason_code" varchar(40),
	"reason_message" varchar(300),
	"existing_version" integer,
	"imported_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alimentacion_bulk_import_batches" ADD CONSTRAINT "alimentacion_bulk_import_batches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alimentacion_bulk_import_batches" ADD CONSTRAINT "alimentacion_bulk_import_batches_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alimentacion_bulk_import_items" ADD CONSTRAINT "alimentacion_bulk_import_items_batch_id_alimentacion_bulk_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."alimentacion_bulk_import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alimentacion_bulk_import_items" ADD CONSTRAINT "alimentacion_bulk_import_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alimentacion_bulk_import_items" ADD CONSTRAINT "alimentacion_bulk_import_items_adulto_mayor_id_adultos_mayores_id_fk" FOREIGN KEY ("adulto_mayor_id") REFERENCES "public"."adultos_mayores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alimentacion_bulk_import_items" ADD CONSTRAINT "alimentacion_bulk_import_items_imported_version_id_alimentacion_formato_imported_versions_id_fk" FOREIGN KEY ("imported_version_id") REFERENCES "public"."alimentacion_formato_imported_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alimentacion_bulk_import_batches_tenant_idx" ON "alimentacion_bulk_import_batches" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "alimentacion_bulk_import_batches_expiry_idx" ON "alimentacion_bulk_import_batches" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "alimentacion_bulk_import_batches_created_by_idx" ON "alimentacion_bulk_import_batches" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "alimentacion_bulk_import_items_batch_idx" ON "alimentacion_bulk_import_items" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "alimentacion_bulk_import_items_lookup_idx" ON "alimentacion_bulk_import_items" USING btree ("tenant_id","normalized_document_number","delivery_month");--> statement-breakpoint
CREATE INDEX "alimentacion_bulk_import_items_hash_idx" ON "alimentacion_bulk_import_items" USING btree ("sha256");--> statement-breakpoint
