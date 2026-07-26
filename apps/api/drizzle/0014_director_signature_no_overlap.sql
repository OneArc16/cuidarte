CREATE EXTENSION IF NOT EXISTS "btree_gist";
--> statement-breakpoint
ALTER TABLE "tenant_director_signature_assignments"
ADD CONSTRAINT "tenant_director_signature_assignments_valid_range"
CHECK (
  "effective_to" IS NULL
  OR "effective_to" >= "effective_from"
);
--> statement-breakpoint
ALTER TABLE "tenant_director_signature_assignments"
ADD CONSTRAINT "tenant_director_signature_assignments_no_overlap"
EXCLUDE USING gist (
  "tenant_id" WITH =,
  daterange(
    "effective_from",
    COALESCE("effective_to", 'infinity'::date),
    '[]'
  ) WITH &&
);
