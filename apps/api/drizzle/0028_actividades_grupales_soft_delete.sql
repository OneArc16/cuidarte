ALTER TABLE "actividades_grupales"
ADD COLUMN "deleted_at" timestamp with time zone;

ALTER TABLE "actividades_grupales"
ADD COLUMN "deleted_by_user_id" uuid REFERENCES "users"("id") ON DELETE restrict;

CREATE INDEX "actividades_grupales_tenant_deleted_at_idx"
ON "actividades_grupales" ("tenant_id", "deleted_at");
