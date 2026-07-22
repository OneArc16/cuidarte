import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { backofficeTenantDetailSchema, tenantLogoMetadataSchema } from "@cuidarte/contracts";

const metadata = {
  versionId: "f18b4d55-e559-41c6-8f51-d45220de0b61",
  originalName: "logo-centro.jpg",
  mimeType: "image/png" as const,
  sizeBytes: 1_204,
  checksum: "a".repeat(64),
  updatedAt: "2026-07-22T12:00:00.000Z",
};

describe("tenant branding contracts", () => {
  it("accepts normalized administrative metadata", () => {
    assert.deepEqual(tenantLogoMetadataSchema.parse(metadata), metadata);
  });

  it("rejects invalid checksums and non-normalized MIME types", () => {
    assert.equal(
      tenantLogoMetadataSchema.safeParse({ ...metadata, checksum: "short" }).success,
      false,
    );
    assert.equal(
      tenantLogoMetadataSchema.safeParse({ ...metadata, mimeType: "image/jpeg" }).success,
      false,
    );
  });

  it("supports tenant details with and without an active logo", () => {
    const detail = {
      tenant: {
        id: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
        documentType: "nit" as const,
        documentNumber: "900123456",
        name: "Centro Demo",
        email: null,
        phone: null,
        address: null,
        city: null,
        department: null,
        isActive: true,
        createdAt: "2026-07-22T12:00:00.000Z",
        updatedAt: "2026-07-22T12:00:00.000Z",
      },
      owner: {
        id: "a9044065-8be3-4f8d-b897-f3355b1c7005",
        tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
        email: "admin@centro.test",
        fullName: "Admin Centro",
        isActive: true,
        createdAt: "2026-07-22T12:00:00.000Z",
        updatedAt: "2026-07-22T12:00:00.000Z",
      },
    };

    assert.equal(backofficeTenantDetailSchema.parse({ ...detail, logo: null }).logo, null);
    assert.deepEqual(
      backofficeTenantDetailSchema.parse({ ...detail, logo: metadata }).logo,
      metadata,
    );
  });
});
