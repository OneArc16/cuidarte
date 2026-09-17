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
      countAtencionesMedico: async () => 31,
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
      { id: "atenciones_medico", total: 31 },
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
      countAtencionesMedico: async () => 31,
      countEmpleados: async () => 42,
      countCompletedImports: async () => 12,
      countActiveTenants: async () => 12,
    });

    const result = await service.getDashboard(superAdminUser);

    assert.equal(result.shortcuts.length, 6);
    assert.equal(result.indicators.length, 4);
    assert.equal(result.activityIndicators.length, 8);
  });

  it("uses the tenant scope for clinical attention totals", async () => {
    const service = new HomeService({} as never);
    let receivedNursingScope: unknown;
    let receivedMedicalScope: unknown;
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
        receivedNursingScope = scope;

        return 0;
      },
      countAtencionesMedico: async (scope) => {
        receivedMedicalScope = scope;

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

    assert.deepEqual(receivedNursingScope, { type: "tenant", tenantId });
    assert.deepEqual(receivedMedicalScope, { type: "tenant", tenantId });
    assert.deepEqual(result.indicators[1], {
      id: "atenciones_enfermeria",
      total: 0,
    });
    assert.deepEqual(result.indicators[2], {
      id: "atenciones_medico",
      total: 0,
    });
  });

  it("excludes trashed nursing attentions from the dashboard total", async () => {
    const service = new HomeService({} as never);
    let receivedExtraCondition: unknown;

    Object.assign(service as unknown as Record<string, unknown>, {
      countRelatedRows: async (
        _table: unknown,
        _tenantColumn: unknown,
        _adultoMayorIdColumn: unknown,
        _scope: unknown,
        extraCondition: unknown,
      ) => {
        receivedExtraCondition = extraCondition;

        return 7;
      },
    });

    const result = await (
      service as unknown as {
        countAtencionesEnfermeria(scope: unknown): Promise<number>;
      }
    ).countAtencionesEnfermeria({ type: "tenant", tenantId });

    assert.equal(result, 7);
    assert.ok(receivedExtraCondition, "Expected nursing counter to receive a deletedAt filter.");
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
    countAtencionesMedico?: (scope: unknown) => Promise<number>;
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
        const queryKind =
          "recordsTotal" in selection
            ? "alimentacion"
            : "activityTypeId" in selection
              ? "actividadesGrouped"
              : "actividadesTotal";

        return {
          from() {
            return this;
          },
          leftJoin() {
            return this;
          },
          innerJoin() {
            return this;
          },
          groupBy() {
            return this;
          },
          where(condition: unknown) {
            if (condition === undefined) {
              throw new Error("Dashboard query used an undefined where condition.");
            }

            if (queryKind === "actividadesTotal") {
              return Promise.resolve([{ total: 469 }]);
            }

            if (queryKind === "actividadesGrouped") {
              return Promise.resolve(buildActivityTypeRows());
            }

            return Promise.resolve([
              {
                recordsTotal: 140,
                deliveredRationsTotal: 123200,
              },
            ]);
          },
          then(
            resolve: (value: Array<Record<string, unknown>>) => unknown,
            reject?: (reason: unknown) => unknown,
          ) {
            if (queryKind === "actividadesTotal") {
              return Promise.resolve([{ total: 469 }]).then(resolve, reject);
            }

            if (queryKind === "actividadesGrouped") {
              return Promise.resolve(buildActivityTypeRows()).then(resolve, reject);
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

function buildActivityTypeRows() {
  const activityTypeIds = [
    "00000000-0000-4000-8000-000000000101",
    "00000000-0000-4000-8000-000000000102",
    "00000000-0000-4000-8000-000000000103",
    "00000000-0000-4000-8000-000000000104",
    "00000000-0000-4000-8000-000000000105",
    "00000000-0000-4000-8000-000000000106",
    "00000000-0000-4000-8000-000000000107",
    "00000000-0000-4000-8000-000000000108",
  ];

  return [
    { activityTypeId: activityTypeIds[0], label: "Salud preventiva", isActive: true, total: 140 },
    { activityTypeId: activityTypeIds[1], label: "Psicosocial", isActive: true, total: 140 },
    { activityTypeId: activityTypeIds[2], label: "Intergeneracional", isActive: true, total: 7 },
    { activityTypeId: activityTypeIds[3], label: "Nutricion", isActive: true, total: 56 },
    { activityTypeId: activityTypeIds[4], label: "Manualidad", isActive: true, total: 42 },
    { activityTypeId: activityTypeIds[5], label: "Fisioterapia", isActive: true, total: 56 },
    { activityTypeId: activityTypeIds[6], label: "Actividad de campo", isActive: true, total: 112 },
    { activityTypeId: activityTypeIds[7], label: "Recreacion", isActive: true, total: 56 },
  ];
}
