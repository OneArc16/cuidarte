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
  it("serves historical emissions without resolving the current logo", async () => {
    let logoWasResolved = false;
    const service = new AlimentacionFormatoExportService(
      {
        async findLatestFormatoEntregaEmission() {
          return {
            tenantId,
            adultoMayorId,
            deliveryMonth: "2026-07",
            pdfRelativePath: `${tenantId}/historic.pdf`,
            filename: "historic.pdf",
          };
        },
        async registerFormatoEntregaExportAudit() {},
      } as never,
      {} as never,
      {
        async resolveActiveLogo() {
          logoWasResolved = true;
          throw new Error("should not resolve");
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

    const result = await service.exportPdf(adultoMayorId, { deliveryMonth: "2026-07" }, actor);

    assert.deepEqual(result.buffer, Buffer.from("historic-pdf"));
    assert.equal(logoWasResolved, false);
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
    const alimentacionService = {
      ...alimentacionServiceForNewEmission(),
      async createFormatoEntregaEmission(command: Record<string, unknown>) {
        createdEmissions.push(command);
      },
    };
    const service = new AlimentacionFormatoExportService(
      alimentacionService as never,
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

function directorSignatureService() {
  return {
    async resolveDirectorSignatureForMonth() {
      return {
        assignment: { employeeId: "2b93919b-182e-49a9-a61c-85f55428061b" },
        employeeFullName: "Director Centro",
        employeeRole: "director",
        signature: {
          id: "7cf28395-e93e-420f-b7e0-92314361a02b",
          relativePath: `${tenantId}/signature.png`,
          originalName: "signature.png",
          mimeType: "image/png",
        },
      };
    },
    async readSignatureFile() {
      return { buffer: Buffer.from("signature"), contentType: "image/png" };
    },
  };
}
