import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import {
  type EmpleadoRecord,
  type EmpleadoSignatureVersionRecord,
} from "../domain/empleado.types";
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
    assert.equal((receivedAudit as { action?: string } | undefined)?.action, "empleados.active_signer_updated");
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
    assert.equal((receivedAudit as { action?: string } | undefined)?.action, "empleados.active_signer_cleared");
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
});

function directorRecord(): EmpleadoRecord {
  return {
    id: employeeId,
    tenantId,
    tenantName: "Centro Demo",
    email: "director@centro-demo.test",
    fullName: "Director Centro Demo",
    firstName: "Director",
    middleName: null,
    firstSurname: "Centro",
    secondSurname: "Demo",
    documentNumber: "1000000000",
    phone: null,
    role: "director",
    isActive: true,
    isTenantOwner: false,
    latestSignature: signature,
    currentDirectorSignatureAssignment: null,
    directorSignatureAssignmentHistory: [],
    tenantActiveSigner: null,
    createdAt: new Date("2026-06-20T12:00:00.000Z"),
    updatedAt: new Date("2026-07-22T19:20:34.531Z"),
  };
}
