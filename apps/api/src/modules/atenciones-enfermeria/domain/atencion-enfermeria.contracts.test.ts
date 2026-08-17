import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  atencionEnfermeriaCommandSchema,
  atencionEnfermeriaDetailSchema,
  updateAtencionEnfermeriaRequestSchema,
} from "@cuidarte/contracts";

describe("atencion-enfermeria contracts", () => {
  const emptyMeasurements = {
    tensionSistolica: null,
    tensionDiastolica: null,
    frecuenciaCardiaca: null,
    frecuenciaRespiratoria: null,
    temperatura: null,
    saturacionOxigeno: null,
    pesoKg: null,
    tallaCm: null,
    perimetroAbdominalCm: null,
    glucometriaMgDl: null,
    glucometriaContext: null,
  };

  it("normalizes optional text and accepts paired glucometry fields", () => {
    const payload = {
      adultoMayorId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
      attentionDate: "2026-08-16",
      attentionTime: "08:30",
      careType: "control_signos_vitales" as const,
      reason: "   ",
      tensionSistolica: 120,
      tensionDiastolica: 80,
      frecuenciaCardiaca: 72,
      frecuenciaRespiratoria: 18,
      temperatura: 36.4,
      saturacionOxigeno: 97,
      pesoKg: 62.3,
      tallaCm: 165,
      perimetroAbdominalCm: 88.5,
      glucometriaMgDl: "95",
      glucometriaContext: "ayunas" as const,
      nursingNote: "Paciente estable.",
    };

    const parsed = atencionEnfermeriaCommandSchema.parse(payload);

    assert.equal(parsed.reason, null);
    assert.equal(parsed.glucometriaMgDl, 95);
    assert.equal(parsed.glucometriaContext, "ayunas");
  });

  it("requires glucometry context in both directions", () => {
    assert.equal(
      atencionEnfermeriaCommandSchema.safeParse({
        adultoMayorId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
        attentionDate: "2026-08-16",
        attentionTime: "08:30",
        careType: "control_signos_vitales",
        reason: null,
        tensionSistolica: null,
        tensionDiastolica: null,
        frecuenciaCardiaca: null,
        frecuenciaRespiratoria: null,
        temperatura: null,
        saturacionOxigeno: null,
        pesoKg: null,
        tallaCm: null,
        perimetroAbdominalCm: null,
        glucometriaMgDl: 95,
        glucometriaContext: null,
        nursingNote: "Paciente estable.",
      }).success,
      false,
    );

    assert.equal(
      atencionEnfermeriaCommandSchema.safeParse({
        adultoMayorId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
        attentionDate: "2026-08-16",
        attentionTime: "08:30",
        careType: "control_signos_vitales",
        reason: null,
        tensionSistolica: null,
        tensionDiastolica: null,
        frecuenciaCardiaca: null,
        frecuenciaRespiratoria: null,
        temperatura: null,
        saturacionOxigeno: null,
        pesoKg: null,
        tallaCm: null,
        perimetroAbdominalCm: null,
        glucometriaMgDl: null,
        glucometriaContext: "ayunas",
        nursingNote: "Paciente estable.",
      }).success,
      false,
    );
  });

  it("requires at least one measurement and a non-empty nursing note", () => {
    const payload = {
      adultoMayorId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
      attentionDate: "2026-08-16",
      attentionTime: "08:30",
      careType: "control_signos_vitales",
      reason: null,
      ...emptyMeasurements,
      nursingNote: "Paciente estable.",
    };

    assert.equal(atencionEnfermeriaCommandSchema.safeParse(payload).success, false);
    assert.equal(
      atencionEnfermeriaCommandSchema.safeParse({
        ...payload,
        tensionSistolica: 120,
        nursingNote: "   ",
      }).success,
      false,
    );
  });

  it("requires the current version for updates", () => {
    const updatePayload = {
      attentionDate: "2026-08-16",
      attentionTime: "08:30",
      careType: "control_signos_vitales",
      reason: null,
      ...emptyMeasurements,
      tensionSistolica: 120,
      nursingNote: "Paciente estable.",
    };

    assert.equal(updateAtencionEnfermeriaRequestSchema.safeParse(updatePayload).success, false);
    assert.equal(
      updateAtencionEnfermeriaRequestSchema.safeParse({ ...updatePayload, version: 1 }).success,
      true,
    );
  });

  it("keeps the detail schema ready for read only responses", () => {
    const detail = {
      id: "11111111-1111-4111-8111-111111111111",
      tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
      tenantName: "Centro Demo",
      adultoMayor: {
        id: "22222222-2222-4222-8222-222222222222",
        tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
        tenantName: "Centro Demo",
        documentNumber: "12345678",
        fullName: "Persona Mayor",
        age: 78,
        sex: "femenino",
        eps: null,
        healthRegime: null,
      },
      adultoMayorId: "22222222-2222-4222-8222-222222222222",
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
      nursingNote: "Paciente estable.",
      imc: 22.9,
      access: "edit" as const,
      professional: {
        userId: "33333333-3333-4333-8333-333333333333",
        fullName: "Enfermera Centro",
        role: "enfermeria" as const,
      },
      createdByUserId: "33333333-3333-4333-8333-333333333333",
      updatedByUserId: "33333333-3333-4333-8333-333333333333",
      version: 1,
      createdAt: "2026-08-16T13:00:00.000Z",
      updatedAt: "2026-08-16T13:00:00.000Z",
    };

    assert.deepEqual(atencionEnfermeriaDetailSchema.parse(detail), detail);

    const parsedUpdate = updateAtencionEnfermeriaRequestSchema.parse({
      ...detail,
      adultoMayorId: detail.adultoMayorId,
    });

    assert.equal("adultoMayorId" in parsedUpdate, false);
  });
});
