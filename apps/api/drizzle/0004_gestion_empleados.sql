DROP INDEX IF EXISTS "users_tenant_owner_unique";--> statement-breakpoint
CREATE TYPE "public"."user_role_new" AS ENUM(
  'super_admin',
  'admin',
  'director',
  'enfermeria',
  'fisioterapeuta',
  'medico',
  'nutricionista',
  'psicologo',
  'recreacionista',
  'trabajadora_social'
);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" varchar(80);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "middle_name" varchar(80);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_surname" varchar(80);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "second_surname" varchar(80);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "document_number" varchar(80);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(40);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_tenant_owner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "public"."user_role_new"
  USING case
    when "role"::text = 'tenant_admin' then 'admin'
    when "role"::text = 'employee' then 'director'
    else "role"::text
  end::"public"."user_role_new";--> statement-breakpoint
UPDATE "users"
SET "is_tenant_owner" = true
WHERE "role" = 'admin' and "tenant_id" is not null;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
ALTER TYPE "public"."user_role_new" RENAME TO "user_role";--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_owner_unique" ON "users" USING btree ("tenant_id") WHERE "users"."is_tenant_owner" = true and "users"."tenant_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_document_unique" ON "users" USING btree ("tenant_id","document_number") WHERE "users"."tenant_id" is not null and "users"."document_number" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_global_document_unique" ON "users" USING btree ("document_number") WHERE "users"."tenant_id" is null and "users"."document_number" is not null;
