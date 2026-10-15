-- Configuración de series por actividad para producción.
-- Las actividades, sus estados y las actas existentes se conservan sin cambios.

-- Evita que un prefijo existente se reasigne silenciosamente a otra actividad
-- dentro del mismo centro.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "actividad_grupal_tipos" AS current_type
    INNER JOIN (
      VALUES
        ('actividad de belleza y peluqueria', 'BELLE'),
        ('actividad de campo', 'CAMP'),
        ('actividades de manualidad', 'MANU'),
        ('actividades de recreacion', 'RECRE'),
        ('centro de vida', 'CENTRO'),
        ('fisioterapia', 'FISIO'),
        ('nutricion', 'NUTRI'),
        ('salud preventiva', 'SALUD'),
        ('sesiones psicosociales', 'PSICO')
    ) AS desired("normalized_name", "prefix")
      ON current_type."consecutive_prefix" = desired."prefix"
     AND current_type."normalized_name" <> desired."normalized_name"
  ) THEN
    RAISE EXCEPTION
      'No se pudo configurar las series de producción: existe un prefijo asignado a otra actividad en el mismo centro.';
  END IF;
END $$;
--> statement-breakpoint

WITH desired("normalized_name", "prefix") AS (
  VALUES
    ('actividad de belleza y peluqueria', 'BELLE'),
    ('actividad de campo', 'CAMP'),
    ('actividades de manualidad', 'MANU'),
    ('actividades de recreacion', 'RECRE'),
    ('centro de vida', 'CENTRO'),
    ('fisioterapia', 'FISIO'),
    ('nutricion', 'NUTRI'),
    ('salud preventiva', 'SALUD'),
    ('sesiones psicosociales', 'PSICO')
)
UPDATE "actividad_grupal_tipos" AS activity_type
SET
  "consecutive_prefix" = desired."prefix",
  "consecutive_next_value" = GREATEST(COALESCE(activity_type."consecutive_next_value", 1), 1),
  "updated_at" = now()
FROM desired
WHERE activity_type."normalized_name" = desired."normalized_name";
--> statement-breakpoint

-- Producción usa una serie independiente por actividad. Las actas existentes
-- mantienen su serie y numeración histórica.
INSERT INTO "actividad_grupal_global_series" ("id", "enabled", "prefix")
VALUES (1, false, NULL)
ON CONFLICT ("id") DO UPDATE
SET
  "enabled" = false,
  "prefix" = NULL,
  "updated_at" = now();
