INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'reportes.view'
FROM "users"
WHERE "role" = 'auditor'
ON CONFLICT ("user_id", "permission") DO NOTHING;
