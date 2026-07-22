import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import { type TenantBrandingRepository } from "../domain/tenant-branding.repository";
import { type TenantLogoVersionRecord } from "../domain/tenant-branding.types";
import { type TenantLogoFilesStorage } from "../domain/tenant-logo-files.storage";
import { TenantBrandingService } from "./tenant-branding.service";
import { type TenantLogoImageProcessor } from "./tenant-logo-image-processor";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const actor: AuthUser = {
  id: "68c499c2-8805-423d-8c7a-fc2649fab102",
  tenantId: null,
  email: "superadmin@cuidarte.test",
  fullName: "Super Admin",
  role: "super_admin",
  passwordSetByAdmin: false,
};

describe("TenantBrandingService", () => {
  it("creates new immutable versions when uploading and replacing a logo", async () => {
    const fixture = createFixture();

    const first = await fixture.service.uploadLogo(tenantId, upload("first.jpg"), actor);
    const second = await fixture.service.uploadLogo(tenantId, upload("second.webp"), actor);

    assert.notEqual(first.versionId, second.versionId);
    assert.equal(fixture.repository.versions.length, 2);
    assert.equal(fixture.repository.active?.originalName, "second.webp");
    assert.equal(fixture.storage.saved.length, 2);
    assert.equal(fixture.storage.deleted.length, 0);
  });

  it("removes only the active assignment and preserves versions", async () => {
    const fixture = createFixture();
    await fixture.service.uploadLogo(tenantId, upload("logo.png"), actor);

    await fixture.service.removeActiveLogo(tenantId, actor);
    await fixture.service.removeActiveLogo(tenantId, actor);

    assert.equal(fixture.repository.active, null);
    assert.equal(fixture.repository.versions.length, 1);
    assert.equal(fixture.storage.deleted.length, 0);
  });

  it("returns actionable errors for authorization, missing tenants and missing active logos", async () => {
    const forbiddenFixture = createFixture();
    await assert.rejects(
      () =>
        forbiddenFixture.service.uploadLogo(tenantId, upload("logo.png"), {
          ...actor,
          role: "admin",
          tenantId,
        }),
      { name: "ForbiddenException" },
    );

    const missingTenantFixture = createFixture({ tenantExists: false });
    await assert.rejects(
      () => missingTenantFixture.service.getAdministrativeLogo(tenantId, actor),
      { name: "NotFoundException" },
    );

    await assert.rejects(
      () => forbiddenFixture.service.resolveActiveLogo(tenantId),
      /El centro no tiene un logo configurado/,
    );
  });

  it("deletes the newly stored file when database persistence fails", async () => {
    const fixture = createFixture({ failPersistence: true });

    await assert.rejects(
      () => fixture.service.uploadLogo(tenantId, upload("logo.png"), actor),
      /database unavailable/,
    );
    assert.deepEqual(fixture.storage.deleted, [fixture.storage.saved[0]]);
  });
});

function createFixture(options: { tenantExists?: boolean; failPersistence?: boolean } = {}) {
  const state = {
    active: null as TenantLogoVersionRecord | null,
    versions: [] as TenantLogoVersionRecord[],
  };
  const repository: TenantBrandingRepository & typeof state = {
    ...state,
    async tenantExists() {
      return options.tenantExists ?? true;
    },
    async findActiveLogoByTenantId() {
      return repository.active;
    },
    async createAndActivateLogo(command) {
      if (options.failPersistence === true) {
        throw new Error("database unavailable");
      }

      const version: TenantLogoVersionRecord = {
        id: `00000000-0000-4000-8000-${String(repository.versions.length + 1).padStart(12, "0")}`,
        tenantId: command.tenantId,
        originalName: command.originalName,
        mimeType: command.mimeType,
        sizeBytes: command.sizeBytes,
        checksum: command.checksum,
        relativePath: command.relativePath,
        uploadedByUserId: command.actorUserId,
        createdAt: new Date("2026-07-22T12:00:00.000Z"),
      };
      repository.versions.push(version);
      repository.active = version;
      return version;
    },
    async removeActiveLogo() {
      repository.active = null;
    },
  };
  const storageState = { saved: [] as string[], deleted: [] as string[] };
  const storage: TenantLogoFilesStorage & typeof storageState = {
    ...storageState,
    async saveFile() {
      const relativePath = `${tenantId}/branding/logos/${storage.saved.length + 1}.png`;
      storage.saved.push(relativePath);
      return { relativePath };
    },
    async readFile() {
      return { buffer: Buffer.from("normalized"), contentType: "image/png" };
    },
    async deleteFile(relativePath) {
      storage.deleted.push(relativePath);
    },
  };
  const processor = {
    async process() {
      return {
        buffer: Buffer.from("normalized"),
        mimeType: "image/png" as const,
        sizeBytes: 10,
        checksum: "a".repeat(64),
        width: 100,
        height: 50,
      };
    },
  } as unknown as TenantLogoImageProcessor;

  return {
    repository,
    storage,
    service: new TenantBrandingService(repository, storage, processor),
  };
}

function upload(originalName: string) {
  return {
    originalName,
    mimeType: originalName.endsWith(".jpg")
      ? "image/jpeg"
      : originalName.endsWith(".webp")
        ? "image/webp"
        : "image/png",
    sizeBytes: 4,
    buffer: Buffer.from("logo"),
  };
}
