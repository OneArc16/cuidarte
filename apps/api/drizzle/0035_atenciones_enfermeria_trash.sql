ALTER TABLE "atenciones_enfermeria"
ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "atenciones_enfermeria"
ADD COLUMN "deleted_by_user_id" uuid REFERENCES "users"("id") ON DELETE restrict;
--> statement-breakpoint
CREATE INDEX "atenciones_enfermeria_tenant_deleted_at_idx"
ON "atenciones_enfermeria" ("tenant_id", "deleted_at");
