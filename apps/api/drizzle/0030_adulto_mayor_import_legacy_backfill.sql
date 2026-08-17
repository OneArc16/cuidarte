UPDATE "adulto_mayor_import_rows" AS rows
SET "status" = 'unchanged'
FROM "adulto_mayor_import_batches" AS batches
WHERE rows."import_batch_id" = batches."id"
  AND rows."status" = 'existing'
  AND batches."update_rows" = 0
  AND batches."updated_rows" = 0
  AND batches."existing_rows" > 0;

UPDATE "adulto_mayor_import_batches"
SET
  "unchanged_rows" = "existing_rows",
  "updated_rows" = 0
WHERE "existing_rows" > 0
  AND "update_rows" = 0
  AND "updated_rows" = 0;
