ALTER TABLE "actividad_grupal_acta_correction_operations"
ADD COLUMN "activity_type_id" uuid REFERENCES "actividad_grupal_tipos"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "actividad_grupal_acta_correction_operations"
ADD COLUMN "target_prefix" varchar(24);
--> statement-breakpoint
CREATE INDEX "actividad_grupal_acta_correction_operations_activity_type_idx"
ON "actividad_grupal_acta_correction_operations" USING btree ("activity_type_id");
