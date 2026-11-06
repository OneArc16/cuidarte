-- Este permiso controla, por persona, la pestaña Estado programa y las fechas de activación,
-- inactivación y reintegro. Por defecto lo conservan los administradores y directores existentes.
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'adultos_mayores.manage_program'
FROM "users"
WHERE "role"::text IN ('super_admin', 'admin', 'director')
ON CONFLICT ("user_id", "permission") DO NOTHING;
