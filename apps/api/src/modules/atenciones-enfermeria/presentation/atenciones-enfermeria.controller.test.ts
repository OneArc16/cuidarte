import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import "reflect-metadata";
import { GUARDS_METADATA } from "@nestjs/common/constants";

import {
  atencionEnfermeriaCrossReadRoleValues,
  atencionEnfermeriaModuleRoleValues,
} from "@cuidarte/contracts";
import { REQUIRED_ROLES_KEY } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { SessionGuard } from "../../auth/session.guard";
import { AtencionesEnfermeriaController } from "./atenciones-enfermeria.controller";

const currentUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  email: "enfermera@centro-demo.test",
  fullName: "Enfermera Centro Demo",
  role: "enfermeria",
  passwordSetByAdmin: true,
};

describe("AtencionesEnfermeriaController", () => {
  it("protects the module with the expected roles and guards", () => {
    assert.deepEqual(Reflect.getMetadata(REQUIRED_ROLES_KEY, AtencionesEnfermeriaController), [
      ...atencionEnfermeriaModuleRoleValues,
    ]);
    assert.deepEqual(Reflect.getMetadata(GUARDS_METADATA, AtencionesEnfermeriaController), [
      SessionGuard,
      RolesGuard,
    ]);
    assert.deepEqual(
      Reflect.getMetadata(
        REQUIRED_ROLES_KEY,
        AtencionesEnfermeriaController.prototype.listAtenciones,
      ),
      atencionEnfermeriaCrossReadRoleValues,
    );
    assert.deepEqual(
      Reflect.getMetadata(
        REQUIRED_ROLES_KEY,
        AtencionesEnfermeriaController.prototype.getHistoriaClinica,
      ),
      atencionEnfermeriaCrossReadRoleValues,
    );
    assert.deepEqual(
      Reflect.getMetadata(REQUIRED_ROLES_KEY, AtencionesEnfermeriaController.prototype.getAtencion),
      atencionEnfermeriaCrossReadRoleValues,
    );
  });

  it("passes the parsed query and current user to the list service", async () => {
    let receivedQuery: unknown = null;
    let receivedActorId: string | null = null;
    const service = {
      async listAtenciones(query: unknown, actor: AuthUser) {
        receivedQuery = query;
        receivedActorId = actor.id;

        return {
          atencionesEnfermeria: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              tenantId: currentUser.tenantId,
              tenantName: "Centro Demo",
              adultoMayor: {
                id: "22222222-2222-4222-8222-222222222222",
                tenantId: currentUser.tenantId,
                tenantName: "Centro Demo",
                documentNumber: "1020304050",
                fullName: "Rosa Elena Martinez Rojas",
                age: 78,
                sex: "female",
                eps: null,
                healthRegime: null,
              },
              attentionDate: "2026-08-16",
              attentionTime: "08:30",
              careType: "control_signos_vitales" as const,
              reason: null,
              tensionSistolica: 120,
              tensionDiastolica: 80,
              frecuenciaCardiaca: 72,
              frecuenciaRespiratoria: 18,
              temperatura: 36.4,
              saturacionOxigeno: 97,
              pesoKg: 62.3,
              tallaCm: 165,
              perimetroAbdominalCm: 88.5,
              glucometriaMgDl: 95,
              glucometriaContext: "ayunas" as const,
              access: "edit" as const,
              professional: {
                userId: currentUser.id,
                fullName: currentUser.fullName,
                role: currentUser.role,
              },
              createdAt: "2026-08-16T13:00:00.000Z",
              updatedAt: "2026-08-16T13:00:00.000Z",
            },
          ],
        };
      },
    };
    const controller = new AtencionesEnfermeriaController(service as never);

    const result = await controller.listAtenciones(
      {
        search: "  control  ",
      } as never,
      {
        currentUser,
      } as never,
    );

    assert.equal(receivedActorId, currentUser.id);
    assert.deepEqual(receivedQuery, {
      search: "control",
      tenantId: null,
      adultoMayorId: null,
      documentNumber: null,
      professionalUserId: null,
      attentionDate: null,
    });
    assert.equal(result.atencionesEnfermeria[0]?.access, "edit");
  });

  it("passes the parsed adult id and current user to the history service", async () => {
    let receivedAdultoId: string | null = null;
    let receivedActorId: string | null = null;
    const service = {
      async getHistoriaClinica(adultoMayorId: string, actor: AuthUser) {
        receivedAdultoId = adultoMayorId;
        receivedActorId = actor.id;

        return {
          adultoMayor: {
            id: adultoMayorId,
            tenantId: currentUser.tenantId,
            tenantName: "Centro Demo",
            documentNumber: "1020304050",
            fullName: "Rosa Elena Martinez Rojas",
            age: 78,
            sex: "female",
            eps: null,
            healthRegime: null,
          },
          atenciones: [],
        };
      },
    };
    const controller = new AtencionesEnfermeriaController(service as never);

    const result = await controller.getHistoriaClinica("0b17e370-8f81-48c0-b707-c7046f497855", {
      currentUser,
    } as never);

    assert.equal(receivedAdultoId, "0b17e370-8f81-48c0-b707-c7046f497855");
    assert.equal(receivedActorId, currentUser.id);
    assert.equal(result.atenciones.length, 0);
  });
});
