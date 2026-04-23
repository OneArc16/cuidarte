ALTER TABLE "adultos_mayores" ALTER COLUMN "names" SET DATA TYPE varchar(180);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ALTER COLUMN "surnames" SET DATA TYPE varchar(180);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "first_name" varchar(80);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "middle_name" varchar(80);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "first_surname" varchar(80);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "second_surname" varchar(80);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "education_level" varchar(80);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "disability" varchar(120);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "population_group" varchar(120);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "address" varchar(220);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "department" varchar(100);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "municipality" varchar(100);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "zone" varchar(20);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "country" varchar(80) DEFAULT 'Colombia';--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "phone_secondary" varchar(40);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "email" varchar(320);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "emergency_contact_full_name" varchar(180);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "emergency_contact_relationship" varchar(80);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "emergency_contact_phone" varchar(40);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "emergency_contact_address" varchar(220);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "blood_type" varchar(20);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "sisben" varchar(40);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "health_regime" varchar(40);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "eps" varchar(160);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "lives_with_someone" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "companion" varchar(160);--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "economic_income" integer;--> statement-breakpoint
ALTER TABLE "adultos_mayores" ADD COLUMN "social_program_beneficiary" boolean DEFAULT false;--> statement-breakpoint
UPDATE "adultos_mayores"
SET
  "first_name" = split_part("names", ' ', 1),
  "middle_name" = nullif(btrim(substr("names", length(split_part("names", ' ', 1)) + 2)), ''),
  "first_surname" = split_part("surnames", ' ', 1),
  "second_surname" = nullif(btrim(substr("surnames", length(split_part("surnames", ' ', 1)) + 2)), ''),
  "address" = 'Sin registrar',
  "department" = 'Sin registrar',
  "municipality" = 'Sin registrar',
  "zone" = 'urban',
  "country" = 'Colombia',
  "lives_with_someone" = false,
  "social_program_beneficiary" = false;--> statement-breakpoint
ALTER TABLE "adultos_mayores" ALTER COLUMN "first_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "adultos_mayores" ALTER COLUMN "first_surname" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "adultos_mayores" ALTER COLUMN "address" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "adultos_mayores" ALTER COLUMN "department" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "adultos_mayores" ALTER COLUMN "municipality" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "adultos_mayores" ALTER COLUMN "zone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "adultos_mayores" ALTER COLUMN "country" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "adultos_mayores" ALTER COLUMN "lives_with_someone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "adultos_mayores" ALTER COLUMN "social_program_beneficiary" SET NOT NULL;
