ALTER TABLE "atencion_individual_support_files" ADD COLUMN "stored_name" varchar(260);
--> statement-breakpoint
ALTER TABLE "atencion_individual_support_files" ADD COLUMN "checksum" varchar(64);
--> statement-breakpoint
ALTER TABLE "atencion_individual_support_files" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "atencion_individual_support_files"
SET "stored_name" = reverse(split_part(reverse("relative_path"), '/', 1));
--> statement-breakpoint
ALTER TABLE "atencion_individual_support_files" ALTER COLUMN "stored_name" SET NOT NULL;
