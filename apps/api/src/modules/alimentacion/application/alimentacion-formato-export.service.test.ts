import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ConflictException } from "@nestjs/common";

import { AlimentacionFormatoExportService } from "./alimentacion-formato-export.service";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const adultoMayorId = "0b17e370-8f81-48c0-b707-c7046f497855";
const logoVersionId = "3f114c03-f31f-475c-92be-d3fcf3d1971b";
const actor = {
  id: "68c499c2-8805-423d-8c7a-fc2649fab102",
  tenantId,
  email: "admin@centro.test",
  fullName: "Admin Centro",
  role: "admin" as const,
  passwordSetByAdmin: false,
};

describe("AlimentacionFormatoExportService tenant logo integration", () => {
  it("serves historical emissions when records and snapshot assets still match", async () => {
    let renderWasCalled = false;
    let exportWasPrepared = false;
    const service = new AlimentacionFormatoExportService(
      {
        async prepareFormatoEntregaExport() {
          exportWasPrepared = true;

          return {
            tenantId,
            tenantName: "Centro Demo",
            tenantCity: "Bogota",
            tenantDepartment: "Cundinamarca",
            adultoMayorId,
            documentNumber: "1020304050",
            fullName: "Rosa Martinez",
            deliveryMonth: "2026-07",
            records: [
              {
                deliveryDate: "2026-07-03",
                organizer: "nutricionista",
                refrigerio1: "entregado",
                almuerzo: "entregado",
                refrigerio2: "entregado",
                auxilioTransporte: "entregado",
                updatedAt: new Date("2026-08-09T11:00:00.000Z"),
              },
            ],
          };
        },
        async findLatestFormatoEntregaEmission() {
          return {
            tenantId,
            adultoMayorId,
            deliveryMonth: "2026-07",
            issuedAt: new Date("2026-08-09T12:00:00.000Z"),
            pdfRelativePath: `${tenantId}/historic.pdf`,
            filename: "historic.pdf",
            signerEmployeeIdSnapshot: "2b93919b-182e-49a9-a61c-85f55428061b",
            signatureVersionIdSnapshot: "7cf28395-e93e-420f-b7e0-92314361a02b",
            tenantLogoVersionIdSnapshot: logoVersionId,
            sourceRecordCount: 1,
            sourceDateFrom: "2026-07-03",
            sourceDateTo: "2026-07-03",
          };
        },
        async registerFormatoEntregaExportAudit() {},
      } as never,
      directorSignatureService() as never,
      {
        async resolveActiveLogo() {
          return {
            id: logoVersionId,
            tenantId,
            relativePath: `${tenantId}/branding/logos/version.png`,
          };
        },
      } as never,
      {
        async readFile() {
          return {
            buffer: Buffer.from("historic-pdf"),
            contentType: "application/pdf",
            filename: "historic.pdf",
          };
        },
      } as never,
    );
    Object.assign(service, {
      async renderPdf() {
        renderWasCalled = true;

        return Buffer.from("new-pdf");
      },
    });

    const result = await service.exportPdf(adultoMayorId, { deliveryMonth: "2026-07" }, actor);

    assert.deepEqual(result.buffer, Buffer.from("historic-pdf"));
    assert.equal(renderWasCalled, false);
    assert.equal(exportWasPrepared, true);
  });

  it("blocks a new emission with 409 before storing or rendering a PDF", async () => {
    let storedPdfCount = 0;
    const service = new AlimentacionFormatoExportService(
      alimentacionServiceForNewEmission() as never,
      directorSignatureService() as never,
      {
        async resolveActiveLogo() {
          throw new ConflictException(
            "El centro no tiene un logo configurado. Solicita al administrador cargarlo antes de exportar el formato.",
          );
        },
      } as never,
      {
        async saveFile() {
          storedPdfCount += 1;
        },
      } as never,
    );

    await assert.rejects(
      () => service.exportPdf(adultoMayorId, { deliveryMonth: "2026-07" }, actor),
      { name: "ConflictException" },
    );
    assert.equal(storedPdfCount, 0);
  });

  it("persists the exact resolved logo version in a new emission snapshot", async () => {
    const createdEmissions: Array<Record<string, unknown>> = [];
    let resolvedSignerRequested = false;
    const alimentacionService = {
      ...alimentacionServiceForNewEmission(),
      async createFormatoEntregaEmission(command: Record<string, unknown>) {
        createdEmissions.push(command);
      },
    };
    const service = new AlimentacionFormatoExportService(
      alimentacionService as never,
      directorSignatureService(() => {
        resolvedSignerRequested = true;
      }) as never,
      {
        async resolveActiveLogo() {
          return {
            id: logoVersionId,
            tenantId,
            relativePath: `${tenantId}/branding/logos/version.png`,
          };
        },
        async readLogoVersionFile() {
          return { buffer: Buffer.from("tenant-logo"), contentType: "image/png" };
        },
      } as never,
      {
        async saveFile(_scope: unknown, file: { filename: string }) {
          return { filename: file.filename, relativePath: `${tenantId}/new.pdf` };
        },
      } as never,
    );
    Object.assign(service, {
      async renderPdf() {
        return Buffer.from("new-pdf");
      },
      async getInstitutionalLogoDataUrl() {
        return null;
      },
    });

    await service.exportPdf(adultoMayorId, { deliveryMonth: "2026-07" }, actor);

    assert.equal(createdEmissions[0]?.tenantLogoVersionIdSnapshot, logoVersionId);
    assert.equal(createdEmissions[0]?.signerEmployeeIdSnapshot, "2b93919b-182e-49a9-a61c-85f55428061b");
    assert.ok(createdEmissions[0]?.issuedAt instanceof Date);
    assert.equal(resolvedSignerRequested, true);
  });

  it("reissues legacy emissions created before the visit-based rollout", async () => {
    let savedPdfCount = 0;
    let createdEmissionCount = 0;
    let logoWasResolved = false;
    const service = new AlimentacionFormatoExportService(
      {
        ...alimentacionServiceForNewEmission(),
        async findLatestFormatoEntregaEmission() {
          return {
            tenantId,
            adultoMayorId,
            deliveryMonth: "2026-07",
            issuedAt: new Date("2026-08-08T12:00:00.000Z"),
            pdfRelativePath: `${tenantId}/historic.pdf`,
            filename: "historic.pdf",
            signerEmployeeIdSnapshot: "2b93919b-182e-49a9-a61c-85f55428061b",
            signatureVersionIdSnapshot: "7cf28395-e93e-420f-b7e0-92314361a02b",
            tenantLogoVersionIdSnapshot: logoVersionId,
            sourceRecordCount: 1,
            sourceDateFrom: "2026-07-03",
            sourceDateTo: "2026-07-03",
          };
        },
        async createFormatoEntregaEmission() {
          createdEmissionCount += 1;
        },
      } as never,
      directorSignatureService() as never,
      {
        async resolveActiveLogo() {
          logoWasResolved = true;

          return {
            id: logoVersionId,
            tenantId,
            relativePath: `${tenantId}/branding/logos/version.png`,
          };
        },
        async readLogoVersionFile() {
          return { buffer: Buffer.from("tenant-logo"), contentType: "image/png" };
        },
      } as never,
      {
        async saveFile(_scope: unknown, file: { filename: string }) {
          savedPdfCount += 1;

          return { filename: file.filename, relativePath: `${tenantId}/reissued.pdf` };
        },
      } as never,
    );
    Object.assign(service, {
      async renderPdf() {
        return Buffer.from("reissued-pdf");
      },
      async getInstitutionalLogoDataUrl() {
        return null;
      },
    });

    const result = await service.exportPdf(adultoMayorId, { deliveryMonth: "2026-07" }, actor);

    assert.deepEqual(result.buffer, Buffer.from("reissued-pdf"));
    assert.equal(logoWasResolved, true);
    assert.equal(savedPdfCount, 1);
    assert.equal(createdEmissionCount, 1);
  });

  it("reissues the PDF when a feeding record was updated after the last emission", async () => {
    let savedPdfCount = 0;
    const service = new AlimentacionFormatoExportService(
      {
        async prepareFormatoEntregaExport() {
          return {
            tenantId,
            tenantName: "Centro Demo",
            tenantCity: "Bogota",
            tenantDepartment: "Cundinamarca",
            adultoMayorId,
            documentNumber: "1020304050",
            fullName: "Rosa Martinez",
            deliveryMonth: "2026-07",
            records: [
              {
                deliveryDate: "2026-07-03",
                organizer: "nutricionista",
                refrigerio1: "no_entregado",
                almuerzo: "entregado",
                refrigerio2: "entregado",
                auxilioTransporte: "entregado",
                updatedAt: new Date("2026-08-09T14:00:00.000Z"),
              },
            ],
          };
        },
        async findLatestFormatoEntregaEmission() {
          return {
            tenantId,
            adultoMayorId,
            deliveryMonth: "2026-07",
            issuedAt: new Date("2026-08-09T12:00:00.000Z"),
            pdfRelativePath: `${tenantId}/historic.pdf`,
            filename: "historic.pdf",
            signerEmployeeIdSnapshot: "2b93919b-182e-49a9-a61c-85f55428061b",
            signatureVersionIdSnapshot: "7cf28395-e93e-420f-b7e0-92314361a02b",
            tenantLogoVersionIdSnapshot: logoVersionId,
            sourceRecordCount: 1,
            sourceDateFrom: "2026-07-03",
            sourceDateTo: "2026-07-03",
          };
        },
        async createFormatoEntregaEmission() {},
        async registerFormatoEntregaExportAudit() {},
      } as never,
      directorSignatureService() as never,
      {
        async resolveActiveLogo() {
          return {
            id: logoVersionId,
            tenantId,
            relativePath: `${tenantId}/branding/logos/version.png`,
          };
        },
        async readLogoVersionFile() {
          return { buffer: Buffer.from("tenant-logo"), contentType: "image/png" };
        },
      } as never,
      {
        async saveFile(_scope: unknown, file: { filename: string }) {
          savedPdfCount += 1;

          return { filename: file.filename, relativePath: `${tenantId}/reissued.pdf` };
        },
      } as never,
    );
    Object.assign(service, {
      async renderPdf() {
        return Buffer.from("reissued-pdf");
      },
      async getInstitutionalLogoDataUrl() {
        return null;
      },
    });

    const result = await service.exportPdf(adultoMayorId, { deliveryMonth: "2026-07" }, actor);

    assert.deepEqual(result.buffer, Buffer.from("reissued-pdf"));
    assert.equal(savedPdfCount, 1);
  });

  it("reissues the PDF when the current signature version changed after the last emission", async () => {
    let savedPdfCount = 0;
    const service = new AlimentacionFormatoExportService(
      {
        async prepareFormatoEntregaExport() {
          return {
            tenantId,
            tenantName: "Centro Demo",
            tenantCity: "Bogota",
            tenantDepartment: "Cundinamarca",
            adultoMayorId,
            documentNumber: "1020304050",
            fullName: "Rosa Martinez",
            deliveryMonth: "2026-07",
            records: [
              {
                deliveryDate: "2026-07-03",
                organizer: "nutricionista",
                refrigerio1: "entregado",
                almuerzo: "entregado",
                refrigerio2: "entregado",
                auxilioTransporte: "entregado",
                updatedAt: new Date("2026-08-09T11:00:00.000Z"),
              },
            ],
          };
        },
        async findLatestFormatoEntregaEmission() {
          return {
            tenantId,
            adultoMayorId,
            deliveryMonth: "2026-07",
            issuedAt: new Date("2026-08-09T12:00:00.000Z"),
            pdfRelativePath: `${tenantId}/historic.pdf`,
            filename: "historic.pdf",
            signerEmployeeIdSnapshot: "2b93919b-182e-49a9-a61c-85f55428061b",
            signatureVersionIdSnapshot: "firma-vieja",
            tenantLogoVersionIdSnapshot: logoVersionId,
            sourceRecordCount: 1,
            sourceDateFrom: "2026-07-03",
            sourceDateTo: "2026-07-03",
          };
        },
        async createFormatoEntregaEmission() {},
        async registerFormatoEntregaExportAudit() {},
      } as never,
      directorSignatureService() as never,
      {
        async resolveActiveLogo() {
          return {
            id: logoVersionId,
            tenantId,
            relativePath: `${tenantId}/branding/logos/version.png`,
          };
        },
        async readLogoVersionFile() {
          return { buffer: Buffer.from("tenant-logo"), contentType: "image/png" };
        },
      } as never,
      {
        async saveFile(_scope: unknown, file: { filename: string }) {
          savedPdfCount += 1;

          return { filename: file.filename, relativePath: `${tenantId}/reissued.pdf` };
        },
      } as never,
    );
    Object.assign(service, {
      async renderPdf() {
        return Buffer.from("reissued-pdf");
      },
      async getInstitutionalLogoDataUrl() {
        return null;
      },
    });

    const result = await service.exportPdf(adultoMayorId, { deliveryMonth: "2026-07" }, actor);

    assert.deepEqual(result.buffer, Buffer.from("reissued-pdf"));
    assert.equal(savedPdfCount, 1);
  });

  it("renders the PDF without director signature when the signature file is missing", async () => {
    let capturedDirectorSignatureDataUrl: string | null | undefined;
    const service = new AlimentacionFormatoExportService(
      alimentacionServiceForNewEmission() as never,
      {
        async resolveTenantActiveDirectorSignature() {
          return {
            activeSigner: {
              tenantId,
              employeeId: "2b93919b-182e-49a9-a61c-85f55428061b",
              signatureVersionId: "7cf28395-e93e-420f-b7e0-92314361a02b",
              activatedByUserId: actor.id,
              activatedAt: new Date("2026-08-09T12:00:00.000Z"),
              updatedAt: new Date("2026-08-09T12:00:00.000Z"),
            },
            employeeFullName: "Director Centro",
            employeeRole: "director",
            signature: {
              id: "7cf28395-e93e-420f-b7e0-92314361a02b",
              employeeId: "2b93919b-182e-49a9-a61c-85f55428061b",
              tenantId,
              relativePath: `${tenantId}/missing-signature.png`,
              originalName: "missing-signature.png",
              mimeType: "image/png",
              sizeBytes: 1,
              checksum: "a".repeat(64),
              createdAt: new Date("2026-08-09T12:00:00.000Z"),
            },
          };
        },
        async readSignatureFile() {
          throw Object.assign(new Error("missing signature"), { code: "ENOENT" });
        },
      } as never,
      {
        async resolveActiveLogo() {
          return {
            id: logoVersionId,
            tenantId,
            relativePath: `${tenantId}/branding/logos/version.png`,
          };
        },
        async readLogoVersionFile() {
          return { buffer: Buffer.from("tenant-logo"), contentType: "image/png" };
        },
      } as never,
      {
        async saveFile(_scope: unknown, file: { filename: string }) {
          return { filename: file.filename, relativePath: `${tenantId}/new.pdf` };
        },
      } as never,
    );
    Object.assign(service, {
      async renderPdf(
        _data: unknown,
        _institutionalLogoDataUrl: string | null,
        _tenantLogoDataUrl: string,
        directorSignatureDataUrl: string | null,
      ) {
        capturedDirectorSignatureDataUrl = directorSignatureDataUrl;

        return Buffer.from("new-pdf");
      },
      async getInstitutionalLogoDataUrl() {
        return null;
      },
    });

    const result = await service.exportPdf(adultoMayorId, { deliveryMonth: "2026-07" }, actor);

    assert.deepEqual(result.buffer, Buffer.from("new-pdf"));
    assert.equal(capturedDirectorSignatureDataUrl, null);
  });
});

function alimentacionServiceForNewEmission() {
  return {
    async findLatestFormatoEntregaEmission() {
      return null;
    },
    async prepareFormatoEntregaExport() {
      return {
        tenantId,
        tenantName: "Centro Demo",
        tenantCity: "Bogota",
        tenantDepartment: "Cundinamarca",
        adultoMayorId,
        documentNumber: "1020304050",
        fullName: "Rosa Martinez",
        deliveryMonth: "2026-07",
        records: [],
      };
    },
    async createFormatoEntregaEmission() {},
    async registerFormatoEntregaExportAudit() {},
  };
}

function directorSignatureService(onResolve?: (token: string) => void) {
  return {
    async resolveTenantActiveDirectorSignature() {
      onResolve?.("resolved");

      return {
        activeSigner: {
          tenantId,
          employeeId: "2b93919b-182e-49a9-a61c-85f55428061b",
          signatureVersionId: "7cf28395-e93e-420f-b7e0-92314361a02b",
          activatedByUserId: actor.id,
          activatedAt: new Date("2026-08-09T12:00:00.000Z"),
          updatedAt: new Date("2026-08-09T12:00:00.000Z"),
        },
        employeeFullName: "Director Centro",
        employeeRole: "director",
        signature: {
          id: "7cf28395-e93e-420f-b7e0-92314361a02b",
          employeeId: "2b93919b-182e-49a9-a61c-85f55428061b",
          tenantId,
          relativePath: `${tenantId}/signature.png`,
          originalName: "signature.png",
          mimeType: "image/png",
          sizeBytes: 1,
          checksum: "a".repeat(64),
          createdAt: new Date("2026-08-09T12:00:00.000Z"),
        },
      };
    },
    async readSignatureFile() {
      return { buffer: Buffer.from("signature"), contentType: "image/png" };
    },
  };
}
