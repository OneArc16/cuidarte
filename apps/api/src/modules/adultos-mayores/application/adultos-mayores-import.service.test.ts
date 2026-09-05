import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRequire } from "node:module";

import { type AuthUser } from "@cuidarte/contracts";

import { type AdultoMayorImportBatchRecord } from "../domain/adulto-mayor-import.types";
import { type AdultosMayoresImportRepository } from "../domain/adultos-mayores-import.repository";

const require = createRequire(__filename);
const { AdultosMayoresImportService } = require("./adultos-mayores-import.service") as {
  AdultosMayoresImportService: typeof import("./adultos-mayores-import.service").AdultosMayoresImportService;
};

const importId = "9f75c51f-74ab-40b7-84ef-9e4a93d14af1";
const actor: AuthUser = {
  id: "1488c239-6cb1-4125-988a-734cd39d13d3",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  email: "admin@cuidarte.test",
  fullName: "Admin CuidarTe",
  role: "admin",
  passwordSetByAdmin: true,
};

describe("AdultosMayoresImportService.confirmImport", () => {
  it("informa por separado las creaciones, actualizaciones y filas sin cambios", async () => {
    const repository = createRepository({
      commitValidatedBatch: async () => ({
        createdRows: 2,
        updatedRows: 3,
        unchangedRows: 1,
        existingRows: 4,
        confirmedAt: new Date("2026-08-11T12:30:00.000Z"),
      }),
    });
    const service = createService(repository);

    const response = await service.confirmImport(importId, actor);

    assert.deepEqual(response, {
      importId,
      status: "completed",
      createdRows: 2,
      updatedRows: 3,
      unchangedRows: 1,
      existingRows: 4,
      completedAt: "2026-08-11T12:30:00.000Z",
    });
  });
});

function createService(repository: AdultosMayoresImportRepository) {
  return new AdultosMayoresImportService(
    repository,
    undefined as never,
    undefined as never,
    undefined as never,
  );
}

function createRepository(
  overrides: Partial<AdultosMayoresImportRepository>,
): AdultosMayoresImportRepository {
  return {
    findImportBatchById: async () => createBatch(),
    lockBatchForConfirmation: async () => createBatch(),
    markImportAsFailed: async () => undefined,
    ...overrides,
  } as AdultosMayoresImportRepository;
}

function createBatch(): AdultoMayorImportBatchRecord {
  return {
    id: importId,
    tenant: {
      id: actor.tenantId!,
      name: "Centro Demo",
    },
    requestedByUserId: actor.id,
    originalFilename: "adultos-mayores.xlsx",
    fileChecksumSha256: "a".repeat(64),
    templateVersion: 1,
    status: "ready",
    summary: {
      totalRows: 6,
      readyRows: 2,
      invalidRows: 0,
      warningRows: 0,
      existingRows: 4,
      updateRows: 3,
      updatedRows: 0,
      unchangedRows: 1,
      createdRows: 0,
    },
    issues: [],
    rows: [],
    canConfirm: true,
    expiresAt: new Date("2099-08-12T12:00:00.000Z"),
    confirmedAt: null,
    failureCode: null,
    createdAt: new Date("2026-08-11T12:00:00.000Z"),
    updatedAt: new Date("2026-08-11T12:00:00.000Z"),
  };
}
