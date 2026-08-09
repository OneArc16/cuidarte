import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser, type CreateBackofficeTenantRequest } from "@cuidarte/contracts";
import { BadRequestException } from "@nestjs/common";

import { BackofficeService } from "./backoffice.service";

const currentUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId: null,
  email: "superadmin@cuidarte.test",
  fullName: "SuperAdmin Cuidarte",
  role: "super_admin",
  passwordSetByAdmin: true,
};

const departmentId = "11111111-1111-1111-1111-111111111111";
const municipalityId = "22222222-2222-2222-2222-222222222222";

describe("BackofficeService", () => {
  it("valida la pareja departamento-municipio antes de crear el tenant", async () => {
    const locationCalls: Array<{ departmentId: string; municipalityId: string }> = [];
    const service = new BackofficeService(
      { db: {} } as never,
      {
        async resolveDepartmentMunicipalityPair(
          requestedDepartmentId: string,
          requestedMunicipalityId: string,
        ) {
          locationCalls.push({
            departmentId: requestedDepartmentId,
            municipalityId: requestedMunicipalityId,
          });
          throw new BadRequestException("El municipio no pertenece al departamento seleccionado.");
        },
      } as never,
    );

    await assert.rejects(
      () => service.createTenant(createCommand(), currentUser),
      { constructor: BadRequestException },
    );
    assert.deepEqual(locationCalls, [{ departmentId, municipalityId }]);
  });
});

function createCommand(): CreateBackofficeTenantRequest {
  return {
    tenant: {
      documentType: "nit",
      documentNumber: null,
      name: "Centro de Vida Demo",
      email: null,
      phone: null,
      address: null,
      departmentId,
      municipalityId,
      isActive: true,
    },
    owner: {
      fullName: "Admin Centro Demo",
      email: "admin@centro-demo.test",
      password: "Cuidarte123!",
      isActive: true,
    },
  };
}
