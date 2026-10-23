-- Este permiso controla, por persona, la visibilidad de la fecha y del usuario creador.
-- Los superadministradores conservan la visibilidad que ya tenían antes de este cambio.
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'actividades_grupales.view_creation_details'
FROM "users"
WHERE "role"::text = 'super_admin'
ON CONFLICT ("user_id", "permission") DO NOTHING;
