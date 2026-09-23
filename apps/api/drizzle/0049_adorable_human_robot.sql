-- Las actas existentes se conservan sin renumeración. Cada una queda asociada
-- a una clave de serie legada para que las nuevas series por actividad no colisionen.
ALTER TABLE "actividad_grupal_tipos"
ADD COLUMN "consecutive_prefix" varchar(24);
--> statement-breakpoint
ALTER TABLE "actividad_grupal_tipos"
ADD COLUMN "consecutive_next_value" integer;
--> statement-breakpoint
ALTER TABLE "actividad_grupal_tipos"
ADD COLUMN "consecutive_creator_roles" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "actividades_grupales"
ADD COLUMN "acta_series_key" varchar(160);
--> statement-breakpoint
UPDATE "actividades_grupales"
SET "acta_series_key" = 'legacy:' || "acta_organizer"::text
WHERE "acta_series_key" IS NULL;
--> statement-breakpoint
ALTER TABLE "actividades_grupales"
ALTER COLUMN "acta_series_key" SET NOT NULL;
--> statement-breakpoint
DROP INDEX "actividades_grupales_tenant_acta_series_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "actividades_grupales_tenant_acta_series_unique"
ON "actividades_grupales" USING btree ("tenant_id", "acta_series_key", "acta_sequence")
WHERE "actividades_grupales"."deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "actividades_grupales_tenant_acta_series_key_idx"
ON "actividades_grupales" USING btree ("tenant_id", "acta_series_key", "acta_sequence");
--> statement-breakpoint
CREATE UNIQUE INDEX "actividad_grupal_tipos_tenant_consecutive_prefix_unique"
ON "actividad_grupal_tipos" USING btree ("tenant_id", "consecutive_prefix")
WHERE "consecutive_prefix" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "actividad_grupal_tipos"
ADD CONSTRAINT "actividad_grupal_tipos_consecutive_config_complete"
CHECK (
  ("consecutive_prefix" IS NULL AND "consecutive_next_value" IS NULL)
  OR ("consecutive_prefix" IS NOT NULL AND "consecutive_next_value" > 0)
);
