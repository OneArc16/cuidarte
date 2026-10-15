import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import { NotFoundException } from "@nestjs/common";

import { EmpleadoSignatureStoredFileNotFoundError } from "../domain/empleados-signature-files.storage";
import { type EmpleadoRecord, type EmpleadoSignatureVersionRecord } from "../domain/empleado.types";
import { EmpleadosSignatureService } from "./empleados-signature.service";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const employeeId = "aeeb7b27-2c8d-48ce-b2f8-3397d34a6e72";
const signatureVersionId = "dc8e2c42-8f96-4f19-b204-adf90e139bf4";

const actor: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId,
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
  passwordSetByAdmin: true,
};

const signature: EmpleadoSignatureVersionRecord = {
  id: signatureVersionId,
  employeeId,
  tenantId,
  originalName: "firma.jpeg",
  mimeType: "image/jpeg",
  sizeBytes: 2048,
  checksum: "a".repeat(64),
  relativePath: `${tenantId}/${employeeId}/firma.jpeg`,
  createdAt: new Date("2026-07-22T19:20:34.531Z"),
};

describe("EmpleadosSignatureService", () => {
  it("uploads an optional signature for a tenant employee", async () => {
    let savedScope: unknown;
    let createdCommand: unknown;
    let createdAudit: unknown;
    const service = new EmpleadosSignatureService(
      {
        async findById() {
          return employeeRecord("medico");
        },
        async createSignatureVersion(command: unknown, audit: unknown) {
          createdCommand = command;
          createdAudit = audit;
          return signature;
        },
      } as never,
      {
        async saveFile(scope: unknown) {
          savedScope = scope;
          return {
            originalName: "firma.jpeg",
            mimeType: "image/jpeg",
            sizeBytes: 2048,
            relativePath: `${tenantId}/${employeeId}/firma.jpeg`,
          };
        },
      } as never,
    );

    const result = await service.uploadSignature(
      employeeId,
      {
        originalName: "firma.jpeg",
        mimeType: "image/jpeg",
        sizeBytes: 2048,
        buffer: Buffer.from("firma"),
      },
      actor,
    );

    assert.equal(result.id, signature.id);
    assert.deepEqual(savedScope, {
      tenantId,
      employeeId,
    });
    assert.deepEqual(createdCommand, {
      employeeId,
      tenantId,
      originalName: "firma.jpeg",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
      checksum: "c3b73a718e2971292c9101fb1b3ea3445754c49261c8ecf513427d84a47bf03c",
      relativePath: `${tenantId}/${employeeId}/firma.jpeg`,
      uploadedByUserId: actor.id,
    });
    assert.equal(
      (createdAudit as { action?: string } | undefined)?.action,
      "empleados.signature_uploaded",
    );
  });

  it("activates the selected director signature for the tenant", async () => {
    let receivedCommand: unknown;
    let receivedAudit: unknown;
    const service = new EmpleadosSignatureService(
      {
        async findById() {
          return directorRecord();
        },
        async findSignatureVersionById() {
          return signature;
        },
        async findTenantActiveSignerByTenantId() {
          return null;
        },
        async resolveTenantActiveDirectorSignatureByTenantId() {
          return null;
        },
        async setTenantActiveSigner(command: unknown, audit: unknown) {
          receivedCommand = command;
          receivedAudit = audit;

          return {
            tenantId,
            employeeId,
            signatureVersionId,
            activatedByUserId: actor.id,
            activatedAt: new Date("2026-08-09T12:00:00.000Z"),
            updatedAt: new Date("2026-08-09T12:00:00.000Z"),
          };
        },
      } as never,
      {} as never,
    );

    const result = await service.setTenantActiveSigner(
      tenantId,
      {
        employeeId,
        signatureVersionId,
      },
      actor,
    );

    assert.equal(result.employeeId, employeeId);
    assert.deepEqual(receivedCommand, {
      tenantId,
      employeeId,
      signatureVersionId,
      activatedByUserId: actor.id,
    });
    assert.equal(
      (receivedAudit as { action?: string } | undefined)?.action,
      "empleados.active_signer_updated",
    );
  });

  it("clears the active signer for a tenant", async () => {
    let receivedCommand: unknown;
    let receivedAudit: unknown;
    const service = new EmpleadosSignatureService(
      {
        async clearTenantActiveSigner(command: unknown, audit: unknown) {
          receivedCommand = command;
          receivedAudit = audit;

          return {
            tenantId,
            employeeId,
            signatureVersionId,
            activatedByUserId: actor.id,
            activatedAt: new Date("2026-08-09T12:00:00.000Z"),
            updatedAt: new Date("2026-08-09T12:00:00.000Z"),
          };
        },
      } as never,
      {} as never,
    );

    const result = await service.clearTenantActiveSigner(tenantId, actor);

    assert.equal(result?.tenantId, tenantId);
    assert.deepEqual(receivedCommand, {
      tenantId,
      deactivatedByUserId: actor.id,
    });
    assert.equal(
      (receivedAudit as { action?: string } | undefined)?.action,
      "empleados.active_signer_cleared",
    );
  });

  it("resolves the active signer signature for a tenant", async () => {
    const service = new EmpleadosSignatureService(
      {
        async resolveTenantActiveDirectorSignatureByTenantId() {
          return {
            activeSigner: {
              tenantId,
              employeeId,
              signatureVersionId,
              activatedByUserId: actor.id,
              activatedAt: new Date("2026-08-09T12:00:00.000Z"),
              updatedAt: new Date("2026-08-09T12:00:00.000Z"),
            },
            employeeFullName: "Director Centro Demo",
            employeeRole: "director",
            signature,
          };
        },
      } as never,
      {} as never,
    );

    const result = await service.resolveTenantActiveDirectorSignature(tenantId);

    assert.equal(result.signature.id, signature.id);
    assert.equal(result.activeSigner.employeeId, employeeId);
  });

  it("maps a missing stored signature file to not found", async () => {
    const service = new EmpleadosSignatureService(
      {
        async findById() {
          return employeeRecord("medico");
        },
      } as never,
      {
        async readFile() {
          throw new EmpleadoSignatureStoredFileNotFoundError();
        },
      } as never,
    );

    await assert.rejects(
      service.downloadLatestSignatureFile(employeeId, actor),
      (error: unknown) =>
        error instanceof NotFoundException &&
        error.message === "No fue posible encontrar el archivo de firma cargado.",
    );
  });
});

function employeeRecord(role: EmpleadoRecord["role"]): EmpleadoRecord {
  return {
    id: employeeId,
    tenantId,
    tenantName: "Centro Demo",
    email: `${role}@centro-demo.test`,
    fullName: role === "director" ? "Director Centro Demo" : "Laura Perez",
    firstName: role === "director" ? "Director" : "Laura",
    middleName: null,
    firstSurname: role === "director" ? "Centro" : "Perez",
    secondSurname: role === "director" ? "Demo" : null,
    documentNumber: "1000000000",
    phone: null,
    role,
    isActive: true,
    isTenantOwner: false,
    actividadGrupalAllowedOrganizers: [],
    latestSignature: signature,
    currentDirectorSignatureAssignment: null,
    directorSignatureAssignmentHistory: [],
    tenantActiveSigner: null,
    createdAt: new Date("2026-06-20T12:00:00.000Z"),
    updatedAt: new Date("2026-07-22T19:20:34.531Z"),
  };
}

function directorRecord(): EmpleadoRecord {
  return employeeRecord("director");
}
