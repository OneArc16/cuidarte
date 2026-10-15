ALTER TABLE "adultos_mayores" ADD COLUMN "antecedentes_personales_vigentes" text;--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "antecedentes_familiares_vigentes" text;--> statement-breakpoint
WITH antecedentes_personales AS (
  SELECT DISTINCT ON ("adulto_mayor_id")
    "adulto_mayor_id",
    "antecedentes_personales"
  FROM "atenciones_individuales"
  WHERE "antecedentes_personales" IS NOT NULL
  ORDER BY "adulto_mayor_id", "attention_date" DESC, "consecutive" DESC, "updated_at" DESC
), antecedentes_familiares AS (
  SELECT DISTINCT ON ("adulto_mayor_id")
    "adulto_mayor_id",
    "antecedentes_familiares"
  FROM "atenciones_individuales"
  WHERE "antecedentes_familiares" IS NOT NULL
  ORDER BY "adulto_mayor_id", "attention_date" DESC, "consecutive" DESC, "updated_at" DESC
)
UPDATE "adultos_mayores" AS adulto
SET
  "antecedentes_personales_vigentes" = personales."antecedentes_personales",
  "antecedentes_familiares_vigentes" = familiares."antecedentes_familiares"
FROM "antecedentes_personales" AS personales
FULL OUTER JOIN "antecedentes_familiares" AS familiares
  ON familiares."adulto_mayor_id" = personales."adulto_mayor_id"
WHERE adulto."id" = COALESCE(personales."adulto_mayor_id", familiares."adulto_mayor_id");
