CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "municipalities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "municipality_id" uuid;--> statement-breakpoint
ALTER TABLE "municipalities" ADD CONSTRAINT "municipalities_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD CONSTRAINT "adultos_mayores_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD CONSTRAINT "adultos_mayores_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "departments_name_unique" ON "departments" USING btree ("name");--> statement-breakpoint
CREATE INDEX "departments_is_active_idx" ON "departments" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "municipalities_department_name_unique" ON "municipalities" USING btree ("department_id","name");--> statement-breakpoint
CREATE INDEX "municipalities_department_id_idx" ON "municipalities" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "municipalities_is_active_idx" ON "municipalities" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "adultos_mayores_department_id_idx" ON "adultos_mayores" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "adultos_mayores_municipality_id_idx" ON "adultos_mayores" USING btree ("municipality_id");
