ALTER TABLE "tenants" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "municipality_id" uuid;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenants_department_id_idx" ON "tenants" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "tenants_municipality_id_idx" ON "tenants" USING btree ("municipality_id");
