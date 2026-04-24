CREATE TYPE "public"."actividad_grupal_responsible_department" AS ENUM('direccion', 'medicina', 'enfermeria', 'psicologia', 'trabajo_social', 'nutricion', 'fisioterapia', 'recreacion');--> statement-breakpoint
CREATE TYPE "public"."actividad_grupal_support_file_kind" AS ENUM('support_photo', 'support_pdf');--> statement-breakpoint
CREATE TABLE "actividad_grupal_diligenciamiento_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"kind" "actividad_grupal_support_file_kind" NOT NULL,
	"original_name" varchar(260) NOT NULL,
	"mime_type" varchar(160) NOT NULL,
	"size_bytes" integer NOT NULL,
	"relative_path" varchar(500) NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "actividad_grupal_diligenciamiento_integrantes" (
	"activity_id" uuid NOT NULL,
	"adulto_mayor_id" uuid NOT NULL,
	CONSTRAINT "actividad_grupal_diligenciamiento_integrantes_pk" PRIMARY KEY("activity_id","adulto_mayor_id")
);
--> statement-breakpoint
CREATE TABLE "actividad_grupal_diligenciamientos" (
	"activity_id" uuid PRIMARY KEY NOT NULL,
	"objectives" text NOT NULL,
	"development" text NOT NULL,
	"conclusion" text NOT NULL,
	"responsible_department" "actividad_grupal_responsible_department" NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actividad_grupal_diligenciamiento_files" ADD CONSTRAINT "actividad_grupal_diligenciamiento_files_activity_id_actividades_grupales_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."actividades_grupales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_grupal_diligenciamiento_files" ADD CONSTRAINT "actividad_grupal_diligenciamiento_files_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_grupal_diligenciamiento_integrantes" ADD CONSTRAINT "actividad_grupal_diligenciamiento_integrantes_activity_id_actividades_grupales_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."actividades_grupales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_grupal_diligenciamiento_integrantes" ADD CONSTRAINT "actividad_grupal_diligenciamiento_integrantes_adulto_mayor_id_adultos_mayores_id_fk" FOREIGN KEY ("adulto_mayor_id") REFERENCES "public"."adultos_mayores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_grupal_diligenciamientos" ADD CONSTRAINT "actividad_grupal_diligenciamientos_activity_id_actividades_grupales_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."actividades_grupales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_grupal_diligenciamientos" ADD CONSTRAINT "actividad_grupal_diligenciamientos_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_grupal_diligenciamientos" ADD CONSTRAINT "actividad_grupal_diligenciamientos_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actividad_grupal_dilig_files_activity_idx" ON "actividad_grupal_diligenciamiento_files" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "actividad_grupal_dilig_files_kind_idx" ON "actividad_grupal_diligenciamiento_files" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "actividad_grupal_dilig_files_created_by_user_idx" ON "actividad_grupal_diligenciamiento_files" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "actividad_grupal_dilig_integrantes_adulto_mayor_idx" ON "actividad_grupal_diligenciamiento_integrantes" USING btree ("adulto_mayor_id");--> statement-breakpoint
CREATE INDEX "actividad_grupal_diligenciamientos_created_by_user_idx" ON "actividad_grupal_diligenciamientos" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "actividad_grupal_diligenciamientos_updated_by_user_idx" ON "actividad_grupal_diligenciamientos" USING btree ("updated_by_user_id");