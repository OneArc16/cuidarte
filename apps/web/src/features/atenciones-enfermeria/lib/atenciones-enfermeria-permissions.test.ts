import { describe, expect, it } from "vitest";

import {
  canCreateAtencionEnfermeria,
  canEditAtencionEnfermeria,
  canOpenAtencionesEnfermeriaModule,
  canReadAtencionesEnfermeria,
  resolveAtencionEnfermeriaAccess,
} from "./atenciones-enfermeria-permissions";

describe("atenciones enfermeria permissions", () => {
  const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
  const ownerId = "11111111-1111-4111-8111-111111111111";

  const ownerRecord = {
    tenantId,
    createdByUserId: ownerId,
  };

  it("allows only the expected dashboard roles to open the module", () => {
    expect(canOpenAtencionesEnfermeriaModule({ role: "enfermeria" })).toBe(true);
    expect(canOpenAtencionesEnfermeriaModule({ role: "admin" })).toBe(true);
    expect(canOpenAtencionesEnfermeriaModule({ role: "medico" })).toBe(false);
  });

  it("allows cross-reading the module for the clinical viewer roles", () => {
    expect(canReadAtencionesEnfermeria({ role: "enfermeria" })).toBe(true);
    expect(canReadAtencionesEnfermeria({ role: "admin" })).toBe(true);
    expect(canReadAtencionesEnfermeria({ role: "medico" })).toBe(true);
    expect(canReadAtencionesEnfermeria({ role: "recreacionista" })).toBe(false);
  });

  it("allows creation only for nursing users", () => {
    expect(canCreateAtencionEnfermeria({ role: "enfermeria" })).toBe(true);
    expect(canCreateAtencionEnfermeria({ role: "admin" })).toBe(false);
  });

  it("returns edit for the author and view for the rest of the same tenant", () => {
    expect(
      resolveAtencionEnfermeriaAccess(
        {
          id: ownerId,
          role: "enfermeria",
          tenantId,
        },
        ownerRecord,
      ),
    ).toBe("edit");
    expect(
      resolveAtencionEnfermeriaAccess(
        {
          id: "22222222-2222-4222-8222-222222222222",
          role: "enfermeria",
          tenantId,
        },
        ownerRecord,
      ),
    ).toBe("view");
    expect(
      resolveAtencionEnfermeriaAccess(
        {
          id: "33333333-3333-4333-8333-333333333333",
          role: "medico",
          tenantId,
        },
        ownerRecord,
      ),
    ).toBe("view");
    expect(
      resolveAtencionEnfermeriaAccess(
        {
          id: "44444444-4444-4444-8444-444444444444",
          role: "admin",
          tenantId: "88888888-8888-4888-8888-888888888888",
        },
        ownerRecord,
      ),
    ).toBe(null);
  });

  it("knows whether a record can be edited", () => {
    expect(
      canEditAtencionEnfermeria(
        {
          id: ownerId,
          role: "enfermeria",
          tenantId,
        },
        ownerRecord,
      ),
    ).toBe(true);
    expect(
      canEditAtencionEnfermeria(
        {
          id: "22222222-2222-4222-8222-222222222222",
          role: "admin",
          tenantId,
        },
        ownerRecord,
      ),
    ).toBe(false);
  });
});
