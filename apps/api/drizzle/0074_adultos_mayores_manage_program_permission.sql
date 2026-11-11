-- Este permiso controla, por persona, la pestaña Estado programa y las fechas de activación,
-- inactivación y reintegro. Inicialmente se concede solo al superadministrador.
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'adultos_mayores.manage_program'
FROM "users"
WHERE "role"::text = 'super_admin'
ON CONFLICT ("user_id", "permission") DO NOTHING;
