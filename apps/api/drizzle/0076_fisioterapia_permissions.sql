INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'fisioterapia.view'
FROM "users"
WHERE "role"::text IN ('super_admin', 'admin', 'auditor', 'director', 'fisioterapeuta')
ON CONFLICT ("user_id", "permission") DO NOTHING;
--> statement-breakpoint
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'fisioterapia.create'
FROM "users"
WHERE "role"::text IN ('super_admin', 'admin', 'director', 'fisioterapeuta')
ON CONFLICT ("user_id", "permission") DO NOTHING;
--> statement-breakpoint
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'fisioterapia.edit_own'
FROM "users"
WHERE "role"::text IN ('super_admin', 'admin', 'director', 'fisioterapeuta')
ON CONFLICT ("user_id", "permission") DO NOTHING;
--> statement-breakpoint
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'fisioterapia.manage'
FROM "users"
WHERE "role"::text IN ('super_admin', 'admin', 'director')
ON CONFLICT ("user_id", "permission") DO NOTHING;
