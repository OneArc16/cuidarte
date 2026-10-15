DROP INDEX "actividades_grupales_tenant_acta_unique";
DROP INDEX "actividades_grupales_tenant_acta_series_unique";
CREATE UNIQUE INDEX "actividades_grupales_tenant_acta_unique" ON "actividades_grupales" USING btree ("tenant_id", "acta_number") WHERE "actividades_grupales"."deleted_at" IS NULL;
CREATE UNIQUE INDEX "actividades_grupales_tenant_acta_series_unique" ON "actividades_grupales" USING btree ("tenant_id", "acta_organizer", "acta_sequence") WHERE "actividades_grupales"."deleted_at" IS NULL;
