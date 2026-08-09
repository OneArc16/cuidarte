ALTER TABLE "departments" ADD COLUMN "code" varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE "municipalities" ADD COLUMN "code" varchar(10) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "departments_code_unique" ON "departments" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "municipalities_code_unique" ON "municipalities" USING btree ("code");
