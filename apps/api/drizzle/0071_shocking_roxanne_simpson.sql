ALTER TABLE "actividades_grupales" ADD COLUMN "last_edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "actividades_grupales" ADD COLUMN "last_edited_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "actividades_grupales" ADD CONSTRAINT "actividades_grupales_last_edited_by_user_id_users_id_fk" FOREIGN KEY ("last_edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actividades_grupales_last_edited_by_user_idx" ON "actividades_grupales" USING btree ("last_edited_by_user_id");
