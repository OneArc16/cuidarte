import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import { BadRequestException, ConflictException } from "@nestjs/common";

import {
  type DirectorSignatureDateResolutionRecord,
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

const resolution: DirectorSignatureDateResolutionRecord = {
  assignment: {
    id: "8f41c6e2-6c19-42c4-821d-5e0eb5bd784f",
    tenantId,
    employeeId,
    signatureVersionId,
    effectiveFrom: "2026-07-22",
    effectiveTo: null,
    createdAt: new Date("2026-07-22T19:21:01.907Z"),
  },
  employeeFullName: "Director Centro Demo",
  employeeRole: "director",
  signature,
};

describe("EmpleadosSignatureService", () => {
  it("resolves the director signature for the exact emission date", async () => {
    let receivedQuery: unknown;
    const service = new EmpleadosSignatureService(
      {
        async resolveDirectorSignatureForDate(query: unknown) {
          receivedQuery = query;
          return [resolution];
        },
      } as never,
      {} as never,
    );

    const result = await service.resolveDirectorSignatureForDate(tenantId, "2026-07-25");

    assert.equal(result.signature.id, signatureVersionId);
    assert.deepEqual(receivedQuery, {
      tenantId,
      effectiveDate: "2026-07-25",
    });
  });

  it("reports when no signature is valid on the emission date", async () => {
    const service = new EmpleadosSignatureService(
      {
        async resolveDirectorSignatureForDate() {
          return [];
        },
      } as never,
      {} as never,
    );

    await assert.rejects(() => service.resolveDirectorSignatureForDate(tenantId, "2026-07-25"), {
      constructor: BadRequestException,
      message: /fecha de emision/i,
    });
  });

  it("reports multiple assignment ranges instead of multiple active directors", async () => {
    const service = new EmpleadosSignatureService(
      {
        async resolveDirectorSignatureForDate() {
          return [resolution, resolution];
        },
      } as never,
      {} as never,
    );

    await assert.rejects(() => service.resolveDirectorSignatureForDate(tenantId, "2026-07-25"), {
      constructor: ConflictException,
      message: /mas de una vigencia de firma/i,
    });
  });

  it("returns a functional conflict when the database rejects an overlapping range", async () => {
    const service = new EmpleadosSignatureService(
      {
        async findById() {
          return directorRecord();
        },
        async findSignatureVersionById() {
          return signature;
        },
        async findLatestDirectorSignatureAssignmentByTenantId() {
          return null;
        },
        async assignDirectorSignature() {
          throw Object.assign(new Error("conflicting key value"), {
            code: "23P01",
            constraint: "tenant_director_signature_assignments_no_overlap",
          });
        },
      } as never,
      {} as never,
    );

    await assert.rejects(
      () =>
        service.assignDirectorSignature(
          employeeId,
          {
            effectiveFrom: "2026-07-22",
            signatureVersionId,
          },
          actor,
        ),
      {
        constructor: ConflictException,
        message: /se cruza con otra vigencia/i,
      },
    );
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
    createdAt: new Date("2026-06-20T12:00:00.000Z"),
    updatedAt: new Date("2026-07-22T19:20:34.531Z"),
  };
}
