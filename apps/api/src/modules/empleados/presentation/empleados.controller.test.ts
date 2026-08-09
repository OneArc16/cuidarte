import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import { EmpleadosController } from "./empleados.controller";

const currentUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
  passwordSetByAdmin: true,
};

describe("EmpleadosController", () => {
  it("passes create commands and current user to the service", async () => {
    const service = {
      createEmpleado: async (command: unknown, actor: AuthUser) => ({
        id: "aeeb7b27-2c8d-48ce-b2f8-3397d34a6e72",
        tenantId: actor.tenantId,
        tenantName: "Centro de Vida Demo",
        documentNumber: (command as { documentNumber: string }).documentNumber,
        fullName: "Laura Natalia Perez Ruiz",
        firstName: "Laura",
        middleName: "Natalia",
        firstSurname: "Perez",
        secondSurname: "Ruiz",
        email: "laura.perez@centro-demo.test",
        phone: "3105551212",
        role: "medico",
        isActive: true,
        latestSignature: null,
        tenantActiveSigner: null,
        currentDirectorSignatureAssignment: null,
        createdAt: "2026-04-21T12:00:00.000Z",
        updatedAt: "2026-04-21T12:00:00.000Z",
      }),
    };
    const controller = new EmpleadosController(service as never, {} as never);

    const result = await controller.createEmpleado(
      {
        firstName: "Laura",
        middleName: "Natalia",
        firstSurname: "Perez",
        secondSurname: "Ruiz",
        email: "LAURA.PEREZ@CENTRO-DEMO.TEST",
        documentNumber: "1010101010",
        phone: "3105551212",
        role: "medico",
        isActive: true,
        password: "Cuidarte123!",
      },
      { currentUser } as never,
    );

    assert.equal(result.email, "laura.perez@centro-demo.test");
    assert.equal(result.documentNumber, "1010101010");
  });

  it("passes update commands and current user to the service", async () => {
    let receivedId: string | null = null;
    const service = {
      updateEmpleado: async (id: string, command: unknown, actor: AuthUser) => {
        receivedId = id;

        return {
          id,
          tenantId: actor.tenantId,
          tenantName: "Centro de Vida Demo",
          documentNumber: (command as { documentNumber: string }).documentNumber,
          fullName: "Laura Natalia Perez Ruiz",
          firstName: "Laura",
          middleName: "Natalia",
          firstSurname: "Perez",
          secondSurname: "Ruiz",
          email: "laura.perez@centro-demo.test",
          phone: "3125553030",
          role: "medico",
          isActive: false,
          latestSignature: null,
          tenantActiveSigner: null,
          currentDirectorSignatureAssignment: null,
          createdAt: "2026-04-21T12:00:00.000Z",
          updatedAt: "2026-04-21T12:00:00.000Z",
        };
      },
    };
    const controller = new EmpleadosController(service as never, {} as never);

    const result = await controller.updateEmpleado(
      "aeeb7b27-2c8d-48ce-b2f8-3397d34a6e72",
      {
        firstName: "Laura",
        middleName: "Natalia",
        firstSurname: "Perez",
        secondSurname: "Ruiz",
        email: "laura.perez@centro-demo.test",
        documentNumber: "1010101010",
        phone: "3125553030",
        role: "medico",
        isActive: false,
      },
      { currentUser } as never,
    );

    assert.equal(receivedId, "aeeb7b27-2c8d-48ce-b2f8-3397d34a6e72");
    assert.equal(result.phone, "3125553030");
  });
});
