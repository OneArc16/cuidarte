CREATE TABLE "tenant_active_signers" (
  "tenant_id" uuid PRIMARY KEY NOT NULL REFERENCES "tenants" ("id") ON DELETE cascade,
  "employee_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE restrict,
  "signature_version_id" uuid NOT NULL REFERENCES "employee_signature_versions" ("id") ON DELETE restrict,
  "activated_by_user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE restrict,
  "activated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "tenant_active_signers_employee_idx" ON "tenant_active_signers" ("employee_id");
CREATE INDEX "tenant_active_signers_signature_version_idx" ON "tenant_active_signers" ("signature_version_id");
CREATE INDEX "tenant_active_signers_activated_by_user_idx" ON "tenant_active_signers" ("activated_by_user_id");
CREATE INDEX "tenant_active_signers_activated_at_idx" ON "tenant_active_signers" ("activated_at");

INSERT INTO "tenant_active_signers" (
  "tenant_id",
  "employee_id",
  "signature_version_id",
  "activated_by_user_id",
  "activated_at",
  "updated_at"
)
SELECT DISTINCT ON ("tenant_id")
  "tenant_id",
  "employee_id",
  "signature_version_id",
  "created_by_user_id",
  "created_at",
  "created_at"
FROM "tenant_director_signature_assignments"
ORDER BY "tenant_id", "effective_from" DESC, "created_at" DESC;
