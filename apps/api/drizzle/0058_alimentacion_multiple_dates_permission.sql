INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'alimentacion.create_multiple_dates'
FROM "users"
WHERE "role" IN ('admin', 'super_admin')
ON CONFLICT ("user_id", "permission") DO NOTHING;
