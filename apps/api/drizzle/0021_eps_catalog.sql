CREATE TABLE "eps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"nit" varchar(20) NOT NULL,
	"name" varchar(160) NOT NULL,
	"name_normalized" varchar(160) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "eps_id" uuid;
--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD CONSTRAINT "adultos_mayores_eps_id_eps_id_fk" FOREIGN KEY ("eps_id") REFERENCES "public"."eps"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "eps_code_unique" ON "eps" USING btree ("code");
--> statement-breakpoint
CREATE UNIQUE INDEX "eps_nit_unique" ON "eps" USING btree ("nit");
--> statement-breakpoint
CREATE UNIQUE INDEX "eps_name_normalized_unique" ON "eps" USING btree ("name_normalized");
--> statement-breakpoint
CREATE INDEX "eps_is_active_idx" ON "eps" USING btree ("is_active");
--> statement-breakpoint
CREATE INDEX "adultos_mayores_eps_id_idx" ON "adultos_mayores" USING btree ("eps_id");
