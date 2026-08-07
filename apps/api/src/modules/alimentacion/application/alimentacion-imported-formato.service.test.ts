import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { AlimentacionImportedFormatoService } from "./alimentacion-imported-formato.service";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const adultoMayorId = "0b17e370-8f81-48c0-b707-c7046f497855";
const importedVersionId = "5e0c3f9e-bff4-4084-ab9e-0a59a2e2ee39";
const actor: AuthUser = {
  id: "68c499c2-8805-423d-8c7a-fc2649fab102",
  tenantId,
  email: "admin@centro.test",
  fullName: "Admin Centro",
  role: "admin",
  passwordSetByAdmin: true,
};

describe("AlimentacionImportedFormatoService", () => {
  it("stores a validated PDF and records the imported version", async () => {
    const recordedCommands: Array<Record<string, unknown>> = [];
    const service = new AlimentacionImportedFormatoService(
      {
        async findAdultoMayorById() {
          return adultoMayor();
        },
        async createImportedFormatoVersion(command: Record<string, unknown>) {
          recordedCommands.push(command);
          return importedVersion();
        },
      } as never,
      {
        async saveFile() {
          return {
            filename: "formato.pdf",
            storedName: "internal.pdf",
            contentType: "application/pdf",
            relativePath: `${tenantId}/${adultoMayorId}/2026-08/internal.pdf`,
          };
        },
      } as never,
    );

    const response = await service.importPdf(
      adultoMayorId,
      { deliveryMonth: "2026-08" },
      pdfUpload(),
      actor,
    );

    assert.equal(response.version.id, importedVersionId);
    assert.equal(response.version.version, 2);
    assert.equal(recordedCommands[0]?.storedName, "internal.pdf");
    assert.equal(recordedCommands[0]?.originalName, "formato.pdf");
  });

  it("cleans up a stored file when metadata persistence fails", async () => {
    let deletedRelativePath: string | null = null;
    const service = new AlimentacionImportedFormatoService(
      {
        async findAdultoMayorById() {
          return adultoMayor();
        },
        async createImportedFormatoVersion() {
          throw new Error("database unavailable");
        },
      } as never,
      {
        async saveFile() {
          return {
            filename: "formato.pdf",
            storedName: "internal.pdf",
            contentType: "application/pdf",
            relativePath: "stored/internal.pdf",
          };
        },
        async deleteFile(relativePath: string) {
          deletedRelativePath = relativePath;
        },
      } as never,
    );

    await assert.rejects(
      () => service.importPdf(adultoMayorId, { deliveryMonth: "2026-08" }, pdfUpload(), actor),
      { name: "InternalServerErrorException" },
    );
    assert.equal(deletedRelativePath, "stored/internal.pdf");
  });

  it("does not allow read-only roles to import", async () => {
    const service = new AlimentacionImportedFormatoService({} as never, {} as never);

    await assert.rejects(
      () =>
        service.importPdf(adultoMayorId, { deliveryMonth: "2026-08" }, pdfUpload(), {
          ...actor,
          role: "auditor",
        }),
      ForbiddenException,
    );
  });

  it("downloads a version within the actor tenant and records the audit", async () => {
    let auditedVersionId: string | null = null;
    const service = new AlimentacionImportedFormatoService(
      {
        async findAdultoMayorById() {
          return adultoMayor();
        },
        async findImportedFormatoVersionById() {
          return importedVersion();
        },
        async createImportedFormatoDownloadAudit(command: { versionId: string }) {
          auditedVersionId = command.versionId;
        },
      } as never,
      {
        async readFile() {
          return {
            buffer: Buffer.from("%PDF-1.7"),
            contentType: "application/pdf",
            filename: "formato.pdf",
          };
        },
      } as never,
    );

    const file = await service.downloadVersion(adultoMayorId, importedVersionId, actor);

    assert.equal(file.contentType, "application/pdf");
    assert.equal(auditedVersionId, importedVersionId);
  });

  it("does not disclose a missing version outside its parent adult", async () => {
    const service = new AlimentacionImportedFormatoService(
      {
        async findAdultoMayorById() {
          return adultoMayor();
        },
        async findImportedFormatoVersionById() {
          return null;
        },
      } as never,
      {} as never,
    );

    await assert.rejects(
      () => service.downloadVersion(adultoMayorId, importedVersionId, actor),
      NotFoundException,
    );
  });
});

function adultoMayor() {
  return {
    id: adultoMayorId,
    tenantId,
    tenantName: "Centro Demo",
    tenantCity: "El Banco",
    tenantDepartment: "Magdalena",
    documentNumber: "1020304050",
    fullName: "Rosa Martinez",
  };
}

function importedVersion() {
  return {
    id: importedVersionId,
    tenantId,
    adultoMayorId,
    deliveryMonth: "2026-08",
    version: 2,
    source: "importado" as const,
    originalName: "formato.pdf",
    storedName: "internal.pdf",
    pdfRelativePath: `${tenantId}/${adultoMayorId}/2026-08/internal.pdf`,
    mimeType: "application/pdf" as const,
    sizeBytes: 16,
    importedByUserId: actor.id,
    importedByUserFullName: actor.fullName,
    importedAt: new Date("2026-08-06T12:00:00.000Z"),
  };
}

function pdfUpload() {
  const buffer = Buffer.from("%PDF-1.7\ncontenido");

  return {
    originalName: "formato.pdf",
    mimeType: "application/pdf",
    sizeBytes: buffer.byteLength,
    buffer,
  };
}
