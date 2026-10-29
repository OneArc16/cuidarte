INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'psicologia.view'
FROM "users"
WHERE "role"::text IN ('super_admin', 'admin', 'auditor', 'director', 'psicologo')
ON CONFLICT ("user_id", "permission") DO NOTHING;
--> statement-breakpoint
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'psicologia.create'
FROM "users"
WHERE "role"::text IN ('super_admin', 'admin', 'director', 'psicologo')
ON CONFLICT ("user_id", "permission") DO NOTHING;
--> statement-breakpoint
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'psicologia.edit_own'
FROM "users"
WHERE "role"::text IN ('super_admin', 'admin', 'director', 'psicologo')
ON CONFLICT ("user_id", "permission") DO NOTHING;
--> statement-breakpoint
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "id", 'psicologia.manage'
FROM "users"
WHERE "role"::text IN ('super_admin', 'admin', 'director')
ON CONFLICT ("user_id", "permission") DO NOTHING;
