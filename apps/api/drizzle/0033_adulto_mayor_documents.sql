CREATE TABLE IF NOT EXISTS "adulto_mayor_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "adulto_mayor_id" uuid NOT NULL UNIQUE,
  "original_name" varchar(260) NOT NULL,
  "mime_type" varchar(160) NOT NULL,
  "size_bytes" integer NOT NULL,
  "relative_path" varchar(500) NOT NULL,
  "uploaded_by_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "adulto_mayor_documents_adulto_mayor_id_fk" FOREIGN KEY ("adulto_mayor_id") REFERENCES "public"."adultos_mayores"("id") ON DELETE cascade,
  CONSTRAINT "adulto_mayor_documents_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict,
  CONSTRAINT "adulto_mayor_documents_mime_type_pdf_check" CHECK ("mime_type" = 'application/pdf'),
  CONSTRAINT "adulto_mayor_documents_size_positive_check" CHECK ("size_bytes" > 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "adulto_mayor_documents_uploaded_by_user_idx" ON "adulto_mayor_documents" USING btree ("uploaded_by_user_id");
