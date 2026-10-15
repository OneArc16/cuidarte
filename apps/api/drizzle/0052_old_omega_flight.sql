CREATE TABLE "user_permissions" (
	"user_id" uuid NOT NULL,
	"permission" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_permissions_pk" PRIMARY KEY("user_id","permission")
);
--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_permissions_permission_idx" ON "user_permissions" USING btree ("permission");
--> statement-breakpoint
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT "users"."id", "permission_defaults"."permission"
FROM "users"
CROSS JOIN (
  VALUES
    ('dashboard.view', ARRAY['super_admin','admin','auditor','director']),
    ('empleados.view', ARRAY['super_admin','admin','auditor','director']),
    ('empleados.create', ARRAY['super_admin','admin','director']),
    ('empleados.edit', ARRAY['super_admin','admin','director']),
    ('actividades_grupales.view', ARRAY['super_admin','admin','auditor','director','enfermeria','fisioterapeuta','medico','nutricionista','psicologo','recreacionista','trabajadora_social']),
    ('actividades_grupales.create', ARRAY['super_admin','admin','director','enfermeria','fisioterapeuta','medico','nutricionista','psicologo','recreacionista','trabajadora_social']),
    ('actividades_grupales.edit', ARRAY['super_admin','admin','director','enfermeria','fisioterapeuta','medico','nutricionista','psicologo','recreacionista','trabajadora_social']),
    ('actividades_grupales.delete', ARRAY['super_admin','admin']),
    ('actividades_grupales.correct', ARRAY['super_admin']),
    ('adultos_mayores.view', ARRAY['super_admin','admin','auditor','director','enfermeria','fisioterapeuta','medico','nutricionista','psicologo','recreacionista','trabajadora_social']),
    ('adultos_mayores.create', ARRAY['super_admin','admin','director','enfermeria','fisioterapeuta','medico','nutricionista','psicologo','recreacionista','trabajadora_social']),
    ('adultos_mayores.edit', ARRAY['super_admin','admin','director','enfermeria','fisioterapeuta','medico','nutricionista','psicologo','recreacionista','trabajadora_social']),
    ('adultos_mayores.delete', ARRAY['super_admin']),
    ('adultos_mayores.import', ARRAY['super_admin','admin','director']),
    ('alimentacion.view', ARRAY['super_admin','admin','auditor','director']),
    ('alimentacion.create', ARRAY['super_admin','admin','director']),
    ('alimentacion.edit', ARRAY['super_admin','admin','director']),
    ('alimentacion.delete', ARRAY['super_admin','admin','director']),
    ('alimentacion.import', ARRAY['super_admin','admin','director']),
    ('alimentacion.export', ARRAY['super_admin','admin','director']),
    ('atenciones_individuales.view', ARRAY['super_admin','admin','auditor','director','enfermeria','fisioterapeuta','medico','nutricionista','psicologo']),
    ('atenciones_individuales.create', ARRAY['super_admin','admin','director','fisioterapeuta','medico','nutricionista','psicologo']),
    ('atenciones_individuales.edit', ARRAY['super_admin','admin','director','fisioterapeuta','medico','nutricionista','psicologo']),
    ('atenciones_enfermeria.view', ARRAY['super_admin','admin','auditor','director','enfermeria','medico']),
    ('atenciones_enfermeria.create', ARRAY['super_admin','admin','director','enfermeria']),
    ('atenciones_enfermeria.edit', ARRAY['super_admin','admin','director','enfermeria']),
    ('atenciones_enfermeria.delete', ARRAY['super_admin','admin','director']),
    ('reportes.view', ARRAY['super_admin','admin','director']),
    ('reportes.export', ARRAY['super_admin','admin','director']),
    ('ajustes.actividades.manage', ARRAY['super_admin','admin'])
) AS "permission_defaults"("permission", "roles")
WHERE "users"."role"::text = ANY("permission_defaults"."roles")
ON CONFLICT ("user_id", "permission") DO NOTHING;
