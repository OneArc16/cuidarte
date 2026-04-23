CREATE TYPE "public"."adulto_mayor_document_type" AS ENUM('cc', 'ce', 'passport', 'other');--> statement-breakpoint
CREATE TYPE "public"."adulto_mayor_sex" AS ENUM('female', 'male', 'other');--> statement-breakpoint
CREATE TABLE "adultos_mayores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_type" "adulto_mayor_document_type" NOT NULL,
	"document_number" varchar(80) NOT NULL,
	"names" varchar(120) NOT NULL,
	"surnames" varchar(120) NOT NULL,
	"phone" varchar(40),
	"birth_date" date NOT NULL,
	"sex" "adulto_mayor_sex" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD CONSTRAINT "adultos_mayores_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "adultos_mayores_tenant_document_unique" ON "adultos_mayores" USING btree ("tenant_id","document_type","document_number");--> statement-breakpoint
CREATE INDEX "adultos_mayores_tenant_id_idx" ON "adultos_mayores" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "adultos_mayores_names_idx" ON "adultos_mayores" USING btree ("names");--> statement-breakpoint
CREATE INDEX "adultos_mayores_surnames_idx" ON "adultos_mayores" USING btree ("surnames");