CREATE TYPE "public"."adulto_mayor_status" AS ENUM('alive', 'deceased');
--> statement-breakpoint
ALTER TABLE "adultos_mayores"
ADD COLUMN "status" "adulto_mayor_status" DEFAULT 'alive' NOT NULL;
