ALTER TABLE "adultos_mayores"
ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "adultos_mayores"
ADD COLUMN "deleted_by_user_id" uuid REFERENCES "users"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "adultos_mayores"
ADD COLUMN "deletion_reason" varchar(500);
--> statement-breakpoint
CREATE INDEX "adultos_mayores_deleted_at_idx"
ON "adultos_mayores" ("deleted_at");
--> statement-breakpoint
CREATE INDEX "adultos_mayores_tenant_deleted_at_idx"
ON "adultos_mayores" ("tenant_id", "deleted_at");
