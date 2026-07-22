import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { LocalTenantLogoFilesStorage } from "./local-tenant-logo-files.storage";

describe("LocalTenantLogoFilesStorage", () => {
  let assetsDirectory = "";
  let storage: LocalTenantLogoFilesStorage;

  before(async () => {
    assetsDirectory = await mkdtemp(path.join(tmpdir(), "cuidarte-tenant-logo-test-"));
    process.env.TENANT_ASSETS_DIR = assetsDirectory;
    storage = new LocalTenantLogoFilesStorage();
  });

  after(async () => {
    await rm(assetsDirectory, { recursive: true, force: true });
  });

  it("writes and reads immutable PNG files under the tenant scope", async () => {
    const first = await storage.saveFile({ tenantId: "tenant-a" }, { buffer: Buffer.from("one") });
    const second = await storage.saveFile({ tenantId: "tenant-a" }, { buffer: Buffer.from("two") });

    assert.notEqual(first.relativePath, second.relativePath);
    assert.match(first.relativePath, /^tenant-a\/branding\/logos\/[a-f0-9-]+\.png$/);
    assert.deepEqual((await storage.readFile(first.relativePath)).buffer, Buffer.from("one"));
  });

  it("rejects path traversal and can compensate an orphan file", async () => {
    await assert.rejects(() => storage.readFile("../../outside.png"), /ruta.*invalida/i);

    const stored = await storage.saveFile(
      { tenantId: "tenant-b" },
      { buffer: Buffer.from("orphan") },
    );
    await storage.deleteFile(stored.relativePath);
    await assert.rejects(() => storage.readFile(stored.relativePath), { code: "ENOENT" });
    await storage.deleteFile(stored.relativePath);
  });
});
