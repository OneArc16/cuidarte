import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import { BadRequestException } from "@nestjs/common";

import { BackofficeController } from "./backoffice.controller";

const currentUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId: null,
  email: "superadmin@cuidarte.test",
  fullName: "SuperAdmin Cuidarte",
  role: "super_admin",
  passwordSetByAdmin: true,
};

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const departmentId = "11111111-1111-1111-1111-111111111111";
const municipalityId = "22222222-2222-2222-2222-222222222222";

describe("BackofficeController", () => {
  it("envia los IDs de ubicacion validados al crear un tenant", async () => {
    const service = createBackofficeService();
    const controller = new BackofficeController(service as never, {} as never);
    const body = createCommandBody();

    await controller.createTenant(body, { currentUser } as never);

    assert.deepEqual(service.createCalls[0], {
      command: {
        ...body,
        tenant: {
          ...body.tenant,
          documentNumber: null,
          email: null,
          phone: null,
          address: null,
        },
      },
      actor: currentUser,
    });
  });

  it("rechaza comandos que no incluyen los IDs de ubicacion", async () => {
    const service = createBackofficeService();
    const controller = new BackofficeController(service as never, {} as never);
    const body = createCommandBody();

    await assert.rejects(
      () =>
        controller.createTenant(
          {
            ...body,
            tenant: {
              ...body.tenant,
              municipalityId: undefined,
            },
          },
          { currentUser } as never,
        ),
      { constructor: BadRequestException },
    );
  });
});

function createBackofficeService() {
  const createCalls: Array<{ command: unknown; actor: AuthUser }> = [];

  return {
    createCalls,
    async createTenant(command: unknown, actor: AuthUser) {
      createCalls.push({ command, actor });

      return createDetail();
    },
  };
}

function createCommandBody() {
  return {
    tenant: {
      documentType: "nit",
      documentNumber: "",
      name: "Centro de Vida Demo",
      email: "",
      phone: "",
      address: "",
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

function createDetail() {
  return {
    tenant: {
      id: tenantId,
      documentType: "nit",
      documentNumber: null,
      name: "Centro de Vida Demo",
      email: null,
      phone: null,
      address: null,
      departmentId,
      municipalityId,
      city: "BOGOTA D.C.",
      department: "BOGOTA D.C.",
      isActive: true,
      createdAt: "2026-08-08T00:00:00.000Z",
      updatedAt: "2026-08-08T00:00:00.000Z",
    },
    owner: {
      id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
      tenantId,
      email: "admin@centro-demo.test",
      fullName: "Admin Centro Demo",
      isActive: true,
      createdAt: "2026-08-08T00:00:00.000Z",
      updatedAt: "2026-08-08T00:00:00.000Z",
    },
  };
}
