INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'alimentacion.view_delivery_days'
FROM "users"
WHERE "role"::text IN ('super_admin', 'admin', 'director')
ON CONFLICT ("user_id", "permission") DO NOTHING;
