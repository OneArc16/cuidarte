DROP INDEX IF EXISTS "tenants_document_unique";
CREATE INDEX "tenants_document_idx" ON "tenants" USING btree ("document_type", "document_number");
