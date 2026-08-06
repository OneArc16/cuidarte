import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { LocalAtencionesIndividualesFilesStorage } from "./local-atenciones-individuales-files.storage";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const atencionId = "2ef00f9e-9a85-47d7-91a4-7030d6f6f951";
const pdfBuffer = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n");

describe("LocalAtencionesIndividualesFilesStorage", () => {
  it("persists PDFs under the tenant/module/entity hierarchy with unique internal names", async () => {
    const baseDir = await mkdtemp(path.join(tmpdir(), "cuidarte-pdf-storage-"));
    const storage = LocalAtencionesIndividualesFilesStorage.forBaseDir(baseDir);

    try {
      const first = await storage.saveFile(
        { tenantId, atencionId },
        {
          originalName: "soporte.pdf",
          mimeType: "application/pdf",
          sizeBytes: pdfBuffer.byteLength,
          buffer: pdfBuffer,
        },
      );
      const second = await storage.saveFile(
        { tenantId, atencionId },
        {
          originalName: "soporte.pdf",
          mimeType: "application/pdf",
          sizeBytes: pdfBuffer.byteLength,
          buffer: pdfBuffer,
        },
      );

      assert.match(
        first.relativePath,
        new RegExp(`^${tenantId}/atenciones-individuales/${atencionId}/[0-9a-f-]+\\.pdf$`),
      );
      assert.notEqual(first.storedName, second.storedName);
      assert.equal(first.checksum, createHash("sha256").update(pdfBuffer).digest("hex"));
      assert.deepEqual(await readFile(path.join(baseDir, first.relativePath)), pdfBuffer);

      const downloaded = await storage.readFile(
        first.relativePath,
        first.originalName,
        first.mimeType,
      );
      assert.deepEqual(downloaded.buffer, pdfBuffer);
      assert.equal(downloaded.contentType, "application/pdf");

      await storage.deleteFile(first.relativePath);
      await assert.rejects(
        () => storage.readFile(first.relativePath, first.originalName, first.mimeType),
        /no existe/,
      );
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it("rejects attempts to escape the configured storage directory", async () => {
    const baseDir = await mkdtemp(path.join(tmpdir(), "cuidarte-pdf-storage-"));
    const storage = LocalAtencionesIndividualesFilesStorage.forBaseDir(baseDir);

    try {
      await assert.rejects(
        () => storage.readFile("../../outside.pdf", "outside.pdf", "application/pdf"),
        /ruta del archivo es invalida/,
      );
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });
});
