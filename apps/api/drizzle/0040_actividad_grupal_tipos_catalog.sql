CREATE TABLE "actividad_grupal_tipos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "name" varchar(120) NOT NULL,
  "normalized_name" varchar(120) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE restrict,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deactivated_at" timestamp with time zone,
  "deactivated_by_user_id" uuid REFERENCES "users"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX "actividad_grupal_tipos_tenant_normalized_name_unique"
ON "actividad_grupal_tipos" ("tenant_id", "normalized_name");
--> statement-breakpoint
CREATE INDEX "actividad_grupal_tipos_tenant_active_idx"
ON "actividad_grupal_tipos" ("tenant_id", "is_active");
--> statement-breakpoint
ALTER TABLE "actividades_grupales"
ADD COLUMN "activity_type_id" uuid REFERENCES "actividad_grupal_tipos"("id") ON DELETE restrict;
--> statement-breakpoint
WITH base_types ("legacy_type", "name", "normalized_name", "position") AS (
  VALUES
    ('centro_vida'::actividad_grupal_type, 'Centro de Vida', 'centro de vida', 1),
    ('actividad_campo'::actividad_grupal_type, 'Actividad de Campo', 'actividad de campo', 2),
    ('sesiones_psicosocial'::actividad_grupal_type, 'Sesiones Psicosociales', 'sesiones psicosociales', 3),
    ('salud_preventiva'::actividad_grupal_type, 'Salud Preventiva', 'salud preventiva', 4),
    ('nutricion'::actividad_grupal_type, 'Nutricion', 'nutricion', 5),
    ('fisioterapia'::actividad_grupal_type, 'Fisioterapia', 'fisioterapia', 6),
    ('encuentro_intergeneracional'::actividad_grupal_type, 'Encuentro Intergeneracional', 'encuentro intergeneracional', 7),
    ('actividades_manualidad'::actividad_grupal_type, 'Actividades de Manualidad', 'actividades de manualidad', 8),
    ('actividades_recreacion'::actividad_grupal_type, 'Actividades de Recreacion', 'actividades de recreacion', 9)
)
INSERT INTO "actividad_grupal_tipos" ("tenant_id", "name", "normalized_name")
SELECT tenants."id", base_types."name", base_types."normalized_name"
FROM "tenants" AS tenants
CROSS JOIN base_types
ON CONFLICT ("tenant_id", "normalized_name") DO NOTHING;
--> statement-breakpoint
WITH base_types ("legacy_type", "normalized_name") AS (
  VALUES
    ('centro_vida'::actividad_grupal_type, 'centro de vida'),
    ('actividad_campo'::actividad_grupal_type, 'actividad de campo'),
    ('sesiones_psicosocial'::actividad_grupal_type, 'sesiones psicosociales'),
    ('salud_preventiva'::actividad_grupal_type, 'salud preventiva'),
    ('nutricion'::actividad_grupal_type, 'nutricion'),
    ('fisioterapia'::actividad_grupal_type, 'fisioterapia'),
    ('encuentro_intergeneracional'::actividad_grupal_type, 'encuentro intergeneracional'),
    ('actividades_manualidad'::actividad_grupal_type, 'actividades de manualidad'),
    ('actividades_recreacion'::actividad_grupal_type, 'actividades de recreacion')
)
UPDATE "actividades_grupales" AS activity
SET "activity_type_id" = type_catalog."id"
FROM base_types
INNER JOIN "actividad_grupal_tipos" AS type_catalog
  ON type_catalog."normalized_name" = base_types."normalized_name"
WHERE activity."tenant_id" = type_catalog."tenant_id"
  AND activity."activity_type" = base_types."legacy_type";
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "actividades_grupales"
    WHERE "activity_type_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'actividad_grupal_tipos migration left sessions without activity_type_id';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "actividades_grupales"
ALTER COLUMN "activity_type_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "actividades_grupales"
ALTER COLUMN "activity_type" DROP NOT NULL;
--> statement-breakpoint
CREATE INDEX "actividades_grupales_activity_type_id_idx"
ON "actividades_grupales" ("activity_type_id");
