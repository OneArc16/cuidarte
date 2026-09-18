DROP INDEX "actividades_grupales_tenant_acta_unique";
--> statement-breakpoint
DROP INDEX "actividades_grupales_tenant_acta_series_unique";
--> statement-breakpoint
WITH identified AS (
  SELECT
    "id",
    "tenant_id",
    "activity_date",
    "start_time",
    "end_time",
    "created_at",
    CASE
      WHEN
        "acta_number" ~* '^[[:space:]]*(ENFER|MED|SALUD)[[:space:]-]*[0-9]+'
        OR "acta_organizer" IN ('medico', 'enfermeria')
        OR "organizer" IN ('medico', 'enfermeria')
        THEN 'medico'::"actividad_grupal_organizer"
      WHEN
        "acta_number" ~* '^[[:space:]]*(PSICO|TSOC)[[:space:]-]*[0-9]+'
        OR "acta_organizer" IN ('psicologa', 'trabajadora_social')
        OR "organizer" IN ('psicologa', 'trabajadora_social')
        THEN 'psicologa'::"actividad_grupal_organizer"
    END AS "team_acta_organizer"
  FROM "actividades_grupales"
), ordered AS (
  SELECT
    "id",
    "team_acta_organizer",
    row_number() OVER (
      PARTITION BY "tenant_id", "team_acta_organizer"
      ORDER BY "activity_date" ASC, "start_time" ASC, "end_time" ASC, "created_at" ASC, "id" ASC
    )::integer AS "acta_sequence"
  FROM identified
  WHERE "team_acta_organizer" IS NOT NULL
)
UPDATE "actividades_grupales" AS activity
SET
  "acta_organizer" = ordered."team_acta_organizer",
  "acta_sequence" = ordered."acta_sequence",
  "acta_number" = CASE ordered."team_acta_organizer"
    WHEN 'medico'::"actividad_grupal_organizer"
      THEN 'SALUD-' || lpad(ordered."acta_sequence"::text, 3, '0')
    WHEN 'psicologa'::"actividad_grupal_organizer"
      THEN 'PSICO-' || lpad(ordered."acta_sequence"::text, 3, '0')
  END
FROM ordered
WHERE activity."id" = ordered."id";
--> statement-breakpoint
INSERT INTO "actividad_grupal_acta_organizer_counters" (
  "tenant_id",
  "organizer",
  "last_value",
  "updated_at"
)
SELECT
  "tenant_id",
  "acta_organizer",
  max("acta_sequence"),
  now()
FROM "actividades_grupales"
WHERE "acta_organizer" IN ('medico', 'psicologa')
GROUP BY "tenant_id", "acta_organizer"
ON CONFLICT ("tenant_id", "organizer") DO UPDATE
SET
  "last_value" = GREATEST(
    "actividad_grupal_acta_organizer_counters"."last_value",
    EXCLUDED."last_value"
  ),
  "updated_at" = EXCLUDED."updated_at";
--> statement-breakpoint
CREATE UNIQUE INDEX "actividades_grupales_tenant_acta_unique"
ON "actividades_grupales" USING btree ("tenant_id", "acta_number")
WHERE "actividades_grupales"."deleted_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "actividades_grupales_tenant_acta_series_unique"
ON "actividades_grupales" USING btree ("tenant_id", "acta_organizer", "acta_sequence")
WHERE "actividades_grupales"."deleted_at" IS NULL;
