import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser, type HomeDashboardIndicatorId } from "@cuidarte/contracts";

import { HomeService } from "./home.service";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";

const superAdminUser: AuthUser = {
  id: "4c5b84e6-d88e-4f8a-93de-af2916d62f40",
  tenantId: null,
  email: "superadmin@cuidarte.test",
  fullName: "Super Admin CuidarTe",
  role: "super_admin",
  passwordSetByAdmin: true,
};

const medicoUser: AuthUser = {
  id: "eaebfa34-4ef2-4b10-b8a5-1db6d494a2a2",
  tenantId,
  email: "medico@centro-demo.test",
  fullName: "Medico Centro Demo",
  role: "medico",
  passwordSetByAdmin: true,
};

describe("HomeService", () => {
  it("builds a full dashboard for SuperAdmin users", async () => {
    const service = new HomeService({} as never);
    stubService(service, {
      countAdultosMayores: async () => 468,
      summarizeActividades: async () => ({
        total: 469,
        byIndicatorId: {
          salud_preventiva: 140,
          sesiones_psicosocial: 140,
          encuentro_intergeneracional: 7,
          nutricion: 56,
          actividades_manualidad: 42,
          fisioterapia: 56,
          actividad_campo: 112,
          actividades_recreacion: 56,
        },
      }),
      summarizeAlimentacion: async () => ({
        recordsTotal: 140,
        deliveredRationsTotal: 123200,
      }),
      countEmpleados: async () => 42,
      countActiveTenants: async () => 12,
    });

    const result = await service.getDashboard(superAdminUser);

    assert.deepEqual(result.shortcuts, [
      { moduleId: "adultos-mayores", total: 468 },
      { moduleId: "sesiones-grupales", total: 469 },
      { moduleId: "registro-alimentacion", total: 140 },
      { moduleId: "gestion-empleados", total: 42 },
      { moduleId: "backoffice", total: 12 },
    ]);
    assert.deepEqual(result.indicators, [
      { id: "adultos_registrados", total: 468 },
      { id: "salud_preventiva", total: 140 },
      { id: "sesiones_psicosocial", total: 140 },
      { id: "raciones_entregadas", total: 123200 },
      { id: "encuentro_intergeneracional", total: 7 },
      { id: "nutricion", total: 56 },
      { id: "actividades_manualidad", total: 42 },
      { id: "fisioterapia", total: 56 },
      { id: "actividad_campo", total: 112 },
      { id: "actividades_recreacion", total: 56 },
    ]);
  });

  it("omits restricted shortcuts for professional roles", async () => {
    const service = new HomeService({} as never);
    stubService(service, {
      countAdultosMayores: async () => 25,
      summarizeActividades: async () => ({
        total: 8,
        byIndicatorId: {
          salud_preventiva: 3,
          sesiones_psicosocial: 1,
          encuentro_intergeneracional: 0,
          nutricion: 0,
          actividades_manualidad: 0,
          fisioterapia: 4,
          actividad_campo: 0,
          actividades_recreacion: 0,
        },
      }),
      summarizeAlimentacion: async () => {
        throw new Error("alimentacion should not be requested");
      },
      countEmpleados: async () => {
        throw new Error("empleados should not be requested");
      },
      countActiveTenants: async () => {
        throw new Error("tenants should not be requested");
      },
    });

    const result = await service.getDashboard(medicoUser);

    assert.deepEqual(result.shortcuts, [
      { moduleId: "adultos-mayores", total: 25 },
      { moduleId: "sesiones-grupales", total: 8 },
    ]);
    assert.deepEqual(result.indicators, [
      { id: "adultos_registrados", total: 25 },
      { id: "salud_preventiva", total: 3 },
      { id: "sesiones_psicosocial", total: 1 },
      { id: "encuentro_intergeneracional", total: 0 },
      { id: "nutricion", total: 0 },
      { id: "actividades_manualidad", total: 0 },
      { id: "fisioterapia", total: 4 },
      { id: "actividad_campo", total: 0 },
      { id: "actividades_recreacion", total: 0 },
    ]);
  });
});

function stubService(
  service: HomeService,
  stubs: {
    countAdultosMayores?: (scope: unknown) => Promise<number>;
    summarizeActividades?: (scope: unknown) => Promise<{
      total: number;
      byIndicatorId: Partial<Record<HomeDashboardIndicatorId, number>>;
    }>;
    summarizeAlimentacion?: (scope: unknown) => Promise<{
      recordsTotal: number;
      deliveredRationsTotal: number;
    }>;
    countEmpleados?: (scope: unknown) => Promise<number>;
    countActiveTenants?: () => Promise<number>;
  },
) {
  Object.assign(service as unknown as Record<string, unknown>, stubs);
}
