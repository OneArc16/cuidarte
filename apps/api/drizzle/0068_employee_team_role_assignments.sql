-- Garantiza el catálogo base de equipos sin alterar la visibilidad que el administrador haya configurado.
INSERT INTO "employee_teams" ("name", "normalized_name") VALUES
  ('Salud', 'salud'),
  ('Psicosocial', 'psicosocial'),
  ('Recreación', 'recreacion'),
  ('Fisioterapia', 'fisioterapia'),
  ('Nutrición', 'nutricion')
ON CONFLICT ("normalized_name") DO NOTHING;
--> statement-breakpoint

-- Asigna los equipos de acuerdo con la especialidad profesional.
-- Los roles administrativos (super_admin, admin, auditor y director) no se modifican.
WITH role_team_map ("role", "normalized_name") AS (
  VALUES
    ('medico'::"user_role", 'salud'),
    ('enfermeria'::"user_role", 'salud'),
    ('psicologo'::"user_role", 'psicosocial'),
    ('trabajadora_social'::"user_role", 'psicosocial'),
    ('recreacionista'::"user_role", 'recreacion'),
    ('fisioterapeuta'::"user_role", 'fisioterapia'),
    ('nutricionista'::"user_role", 'nutricion')
)
UPDATE "users" AS "user"
SET
  "team_id" = "team"."id",
  "updated_at" = now()
FROM role_team_map AS "mapping"
JOIN "employee_teams" AS "team"
  ON "team"."normalized_name" = "mapping"."normalized_name"
WHERE "user"."role" = "mapping"."role"
  AND "user"."team_id" IS DISTINCT FROM "team"."id";
