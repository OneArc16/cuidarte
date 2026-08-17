import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser, type HomeDashboardIndicatorId } from "@cuidarte/contracts";
import { ForbiddenException } from "@nestjs/common";

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
      countAtencionesEnfermeria: async () => 84,
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
      countCompletedImports: async () => 12,
      countActiveTenants: async () => 12,
    });

    const result = await service.getDashboard(superAdminUser);

    assert.deepEqual(result.shortcuts, [
      { moduleId: "adultos-mayores", total: 468 },
      { moduleId: "importacion-adultos-mayores", total: 12 },
      { moduleId: "sesiones-grupales", total: 469 },
      { moduleId: "registro-alimentacion", total: 140 },
      { moduleId: "gestion-empleados", total: 42 },
      { moduleId: "backoffice", total: 12 },
    ]);
    assert.deepEqual(result.indicators, [
      { id: "adultos_registrados", total: 468 },
      { id: "atenciones_enfermeria", total: 84 },
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

  it("does not rely on undefined where clauses for super admin dashboard queries", async () => {
    const service = new HomeService(createDashboardDatabase() as never);
    stubService(service, {
      countAdultosMayores: async () => 468,
      countAtencionesEnfermeria: async () => 84,
      countEmpleados: async () => 42,
      countCompletedImports: async () => 12,
      countActiveTenants: async () => 12,
    });

    const result = await service.getDashboard(superAdminUser);

    assert.equal(result.shortcuts.length, 6);
    assert.equal(result.indicators.length, 11);
  });

  it("uses the tenant scope for nursing totals", async () => {
    const service = new HomeService({} as never);
    let receivedScope: unknown;
    const tenantAdminUser: AuthUser = {
      ...superAdminUser,
      id: "8e1b1d74-4e4c-4d2f-b8cc-1a8df1a6d2b7",
      tenantId,
      email: "admin@centro-demo.test",
      fullName: "Admin Centro Demo",
      role: "admin",
    };

    stubService(service, {
      countAdultosMayores: async () => 0,
      countAtencionesEnfermeria: async (scope) => {
        receivedScope = scope;

        return 0;
      },
      summarizeActividades: async () => ({
        total: 0,
        byIndicatorId: {
          salud_preventiva: 0,
          sesiones_psicosocial: 0,
          encuentro_intergeneracional: 0,
          nutricion: 0,
          actividades_manualidad: 0,
          fisioterapia: 0,
          actividad_campo: 0,
          actividades_recreacion: 0,
        },
      }),
      summarizeAlimentacion: async () => ({
        recordsTotal: 0,
        deliveredRationsTotal: 0,
      }),
      countEmpleados: async () => 0,
      countCompletedImports: async () => 0,
    });

    const result = await service.getDashboard(tenantAdminUser);

    assert.deepEqual(receivedScope, { type: "tenant", tenantId });
    assert.deepEqual(result.indicators[1], {
      id: "atenciones_enfermeria",
      total: 0,
    });
  });

  it("rejects roles without dashboard access", async () => {
    const service = new HomeService({} as never);

    let caughtError: unknown;

    try {
      await service.getDashboard(medicoUser);
    } catch (error) {
      caughtError = error;
    }

    if (!(caughtError instanceof ForbiddenException)) {
      throw new Error("Expected HomeService to reject unauthorized roles with ForbiddenException");
    }

    assert.equal(caughtError.message, "No tienes permisos para acceder a este recurso.");
  });
});

function stubService(
  service: HomeService,
  stubs: {
    countAdultosMayores?: (scope: unknown) => Promise<number>;
    countAtencionesEnfermeria?: (scope: unknown) => Promise<number>;
    summarizeActividades?: (scope: unknown) => Promise<{
      total: number;
      byIndicatorId: Partial<Record<HomeDashboardIndicatorId, number>>;
    }>;
    summarizeAlimentacion?: (scope: unknown) => Promise<{
      recordsTotal: number;
      deliveredRationsTotal: number;
    }>;
    countEmpleados?: (scope: unknown) => Promise<number>;
    countCompletedImports?: (scope: unknown) => Promise<number>;
    countActiveTenants?: () => Promise<number>;
  },
  ) {
  Object.assign(service as unknown as Record<string, unknown>, stubs);
}

function createDashboardDatabase() {
  return {
    db: {
      select(selection: Record<string, unknown>) {
        const queryKind = "activityType" in selection ? "actividades" : "alimentacion";

        return {
          from() {
            return this;
          },
          groupBy() {
            return this;
          },
          where(condition: unknown) {
            if (condition === undefined) {
              throw new Error("Dashboard query used an undefined where condition.");
            }

            if (queryKind === "actividades") {
              return Promise.resolve([
                { total: 469 },
                { activityType: "salud_preventiva", total: 140 },
                { activityType: "sesiones_psicosocial", total: 140 },
                { activityType: "encuentro_intergeneracional", total: 7 },
                { activityType: "nutricion", total: 56 },
                { activityType: "actividades_manualidad", total: 42 },
                { activityType: "fisioterapia", total: 56 },
                { activityType: "actividad_campo", total: 112 },
                { activityType: "actividades_recreacion", total: 56 },
              ]);
            }

            return Promise.resolve([
              {
                recordsTotal: 140,
                deliveredRationsTotal: 123200,
              },
            ]);
          },
          then(
            resolve: (value: Array<Record<string, number | string>>) => unknown,
            reject?: (reason: unknown) => unknown,
          ) {
            if (queryKind === "actividades") {
              return Promise.resolve([
                { total: 469 },
                { activityType: "salud_preventiva", total: 140 },
                { activityType: "sesiones_psicosocial", total: 140 },
                { activityType: "encuentro_intergeneracional", total: 7 },
                { activityType: "nutricion", total: 56 },
                { activityType: "actividades_manualidad", total: 42 },
                { activityType: "fisioterapia", total: 56 },
                { activityType: "actividad_campo", total: 112 },
                { activityType: "actividades_recreacion", total: 56 },
              ]).then(resolve, reject);
            }

            return Promise.resolve([
              {
                recordsTotal: 140,
                deliveredRationsTotal: 123200,
              },
            ]).then(resolve, reject);
          },
        };
      },
    },
  };
}
