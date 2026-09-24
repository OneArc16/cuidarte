ALTER TABLE "users"
ADD COLUMN "actividad_grupal_allowed_organizers" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
UPDATE "users"
SET "actividad_grupal_allowed_organizers" = CASE
  WHEN "can_create_activities_for_other_organizers" THEN
    '["director", "medico", "enfermeria", "psicologa", "trabajadora_social", "nutricionista", "fisioterapeuta", "recreacionista"]'::jsonb
  ELSE '[]'::jsonb
END;
--> statement-breakpoint
ALTER TABLE "users"
DROP COLUMN "can_create_activities_for_other_organizers";
