import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import { AtencionesIndividualesController } from "./atenciones-individuales.controller";

const currentUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  email: "medico@centro-demo.test",
  fullName: "Medico Centro Demo",
  role: "medico",
  passwordSetByAdmin: true,
};

describe("AtencionesIndividualesController", () => {
  it("passes the adult id and current user to historia clinica", async () => {
    const service = createAtencionesService();
    const controller = new AtencionesIndividualesController(service as never);

    const result = await controller.getHistoriaClinica(
      "0b17e370-8f81-48c0-b707-c7046f497855",
      {
        currentUser,
      } as never,
    );

    assert.deepEqual(service.historyCalls[0], {
      adultoMayorId: "0b17e370-8f81-48c0-b707-c7046f497855",
      actor: currentUser,
    });
    assert.equal(result.atenciones[0]?.access, "edit");
  });

  it("passes the atencion id and current user to the detail service", async () => {
    const service = createAtencionesService();
    const controller = new AtencionesIndividualesController(service as never);

    const result = await controller.getAtencion(
      "2ef00f9e-9a85-47d7-91a4-7030d6f6f951",
      {
        currentUser,
      } as never,
    );

    assert.deepEqual(service.detailCalls[0], {
      atencionId: "2ef00f9e-9a85-47d7-91a4-7030d6f6f951",
      actor: currentUser,
    });
    assert.equal(result.id, "2ef00f9e-9a85-47d7-91a4-7030d6f6f951");
  });
});

function createAtencionesService() {
  const historyCalls: Array<{ adultoMayorId: string; actor: AuthUser }> = [];
  const detailCalls: Array<{ atencionId: string; actor: AuthUser }> = [];

  return {
    historyCalls,
    detailCalls,
    async getHistoriaClinica(adultoMayorId: string, actor: AuthUser) {
      historyCalls.push({ adultoMayorId, actor });

      return {
        adultoMayor: {
          id: "0b17e370-8f81-48c0-b707-c7046f497855",
          tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
          tenantName: "Centro de Vida Demo",
          documentNumber: "1020304050",
          fullName: "Rosa Elena Martinez Rojas",
          age: 78,
          sex: "female",
          eps: "Salud Demo",
          healthRegime: "subsidized",
        },
        atenciones: [
          {
            id: "2ef00f9e-9a85-47d7-91a4-7030d6f6f951",
            adultoMayorId: "0b17e370-8f81-48c0-b707-c7046f497855",
            attentionDate: "2026-04-24",
            modalidad: "intramural" as const,
            tipoConsulta: "primera_vez" as const,
            nombreConsulta: "Atencion individual",
            consecutive: 1,
            createdAt: "2026-04-24T12:00:00.000Z",
            updatedAt: "2026-04-24T12:00:00.000Z",
            professional: {
              userId: currentUser.id,
              fullName: currentUser.fullName,
              role: currentUser.role,
            },
            access: "edit" as const,
          },
        ],
      };
    },
    async getAtencion(atencionId: string, actor: AuthUser) {
      detailCalls.push({ atencionId, actor });

      return {
        id: atencionId,
        tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
        tenantName: "Centro de Vida Demo",
        adultoMayorId: "0b17e370-8f81-48c0-b707-c7046f497855",
        adultoMayor: {
          id: "0b17e370-8f81-48c0-b707-c7046f497855",
          tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
          tenantName: "Centro de Vida Demo",
          documentNumber: "1020304050",
          fullName: "Rosa Elena Martinez Rojas",
          age: 78,
          sex: "female",
          eps: "Salud Demo",
          healthRegime: "subsidized",
        },
        attentionDate: "2026-04-24",
        modalidad: "intramural" as const,
        tipoConsulta: "primera_vez" as const,
        nombreConsulta: "Atencion individual",
        consecutive: 1,
        finalidad: "resolutiva_atencion_general" as const,
        causaExterna: "enfermedad_general" as const,
        motivoConsulta: "Dolor general",
        enfermedadActual: "Paciente refiere dolor general.",
        antecedentesPersonales: null,
        antecedentesFamiliares: null,
        tensionSistolica: 120,
        tensionDiastolica: 80,
        frecuenciaCardiaca: null,
        frecuenciaRespiratoria: null,
        temperatura: null,
        saturacionOxigeno: null,
        pesoKg: null,
        tallaCm: null,
        imc: null,
        perimetroAbdominalCm: null,
        examenFisico: null,
        resultadosLaboratorios: null,
        resultadosProcedimientos: null,
        ordenesMedicas: [],
        diagnosticos: [
          {
            id: "diagnostico-1",
            codigoCie10: "I10",
            descripcion: "Hipertension esencial",
            tipo: "principal" as const,
          },
        ],
        supportFiles: [],
        createdByUserId: currentUser.id,
        updatedByUserId: currentUser.id,
        createdAt: "2026-04-24T12:00:00.000Z",
        updatedAt: "2026-04-24T12:00:00.000Z",
      };
    },
  };
}
