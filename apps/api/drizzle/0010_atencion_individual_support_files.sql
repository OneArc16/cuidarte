CREATE TABLE "atencion_individual_support_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"atencion_id" uuid NOT NULL,
	"original_name" varchar(260) NOT NULL,
	"mime_type" varchar(160) NOT NULL,
	"size_bytes" integer NOT NULL,
	"relative_path" varchar(500) NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "atencion_individual_support_files" ADD CONSTRAINT "atencion_individual_support_files_atencion_id_atenciones_individuales_id_fk" FOREIGN KEY ("atencion_id") REFERENCES "public"."atenciones_individuales"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "atencion_individual_support_files" ADD CONSTRAINT "atencion_individual_support_files_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "atencion_individual_support_files_atencion_idx" ON "atencion_individual_support_files" USING btree ("atencion_id");
--> statement-breakpoint
CREATE INDEX "atencion_individual_support_files_created_by_user_idx" ON "atencion_individual_support_files" USING btree ("created_by_user_id");
