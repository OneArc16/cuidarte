CREATE TABLE "employee_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"normalized_name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "employee_teams" ("name", "normalized_name") VALUES
  ('Salud', 'salud'),
  ('Psicosocial', 'psicosocial'),
  ('Recreación', 'recreacion'),
  ('Fisioterapia', 'fisioterapia'),
  ('Nutrición', 'nutricion');
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "team_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "employee_teams_normalized_name_unique" ON "employee_teams" USING btree ("normalized_name");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_employee_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."employee_teams"("id") ON DELETE restrict ON UPDATE no action;
