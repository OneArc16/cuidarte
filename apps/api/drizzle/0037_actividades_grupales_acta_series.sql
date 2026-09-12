ALTER TABLE "actividades_grupales"
ADD COLUMN "acta_organizer" "actividad_grupal_organizer";
--> statement-breakpoint
ALTER TABLE "actividades_grupales"
ADD COLUMN "acta_sequence" integer;
--> statement-breakpoint
ALTER TABLE "actividades_grupales"
ADD COLUMN "previous_acta_number" varchar(40);
--> statement-breakpoint
ALTER TABLE "actividades_grupales"
ADD COLUMN "acta_number_corrected_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "actividades_grupales"
ADD COLUMN "acta_number_corrected_by_user_id" uuid REFERENCES "users"("id") ON DELETE restrict;
--> statement-breakpoint
CREATE TABLE "actividad_grupal_acta_organizer_counters" (
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "organizer" "actividad_grupal_organizer" NOT NULL,
  "last_value" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "actividad_grupal_acta_organizer_counters_pk" PRIMARY KEY("tenant_id", "organizer")
);
--> statement-breakpoint
CREATE INDEX "actividad_grupal_acta_organizer_counters_updated_at_idx"
ON "actividad_grupal_acta_organizer_counters" ("updated_at");
--> statement-breakpoint
CREATE TABLE "actividad_grupal_acta_correction_operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "requested_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE restrict,
  "snapshot_hash" varchar(64) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "actividad_grupal_acta_correction_operations_tenant_idx"
ON "actividad_grupal_acta_correction_operations" ("tenant_id");
--> statement-breakpoint
CREATE INDEX "actividad_grupal_acta_correction_operations_expires_idx"
ON "actividad_grupal_acta_correction_operations" ("expires_at");
--> statement-breakpoint
WITH ordered AS (
  SELECT
    "id",
    "tenant_id",
    "organizer",
    row_number() OVER (
      PARTITION BY "tenant_id", "organizer"
      ORDER BY "activity_date" ASC, "start_time" ASC, "end_time" ASC, "created_at" ASC, "id" ASC
    )::integer AS sequence
  FROM "actividades_grupales"
)
UPDATE "actividades_grupales" AS activity
SET "acta_organizer" = ordered."organizer",
    "acta_sequence" = ordered.sequence
FROM ordered
WHERE activity."id" = ordered."id";
--> statement-breakpoint
INSERT INTO "actividad_grupal_acta_organizer_counters" ("tenant_id", "organizer", "last_value")
SELECT
  "tenant_id",
  "acta_organizer",
  GREATEST(
    max("acta_sequence"),
    COALESCE(max(CASE
      WHEN "acta_number" ~ '[0-9]+$' THEN substring("acta_number" FROM '[0-9]+$')::integer
      ELSE 0
    END), 0)
  )
FROM "actividades_grupales"
GROUP BY "tenant_id", "acta_organizer"
ON CONFLICT ("tenant_id", "organizer") DO UPDATE
SET "last_value" = GREATEST(
  "actividad_grupal_acta_organizer_counters"."last_value",
  EXCLUDED."last_value"
);
--> statement-breakpoint
ALTER TABLE "actividades_grupales"
ALTER COLUMN "acta_organizer" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "actividades_grupales"
ALTER COLUMN "acta_sequence" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "actividades_grupales_tenant_acta_series_unique"
ON "actividades_grupales" ("tenant_id", "acta_organizer", "acta_sequence");
--> statement-breakpoint
CREATE INDEX "actividades_grupales_tenant_acta_series_idx"
ON "actividades_grupales" ("tenant_id", "acta_organizer", "acta_sequence");
--> statement-breakpoint
ALTER TABLE "actividades_grupales"
ADD CONSTRAINT "actividades_grupales_acta_sequence_positive" CHECK ("acta_sequence" > 0);
