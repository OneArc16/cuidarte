import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AdultosMayoresImportValidator } from "./adultos-mayores-import-validator";
import type {
  AdultoMayorImportCatalogMaps,
  AdultoMayorImportExistingRecord,
  AdultoMayorImportRowInput,
} from "./adulto-mayor-import.types";

const validator = new AdultosMayoresImportValidator();
const departmentId = "11111111-1111-4111-8111-111111111111";
const municipalityId = "22222222-2222-4222-8222-222222222222";
const epsId = "33333333-3333-4333-8333-333333333333";

const catalogs: AdultoMayorImportCatalogMaps = {
  departmentsByCode: new Map([["47", { id: departmentId, name: "Magdalena" }]]),
  municipalitiesByCode: new Map([
    ["47001", { id: municipalityId, departmentId, name: "Santa Marta" }],
  ]),
  epsByCode: new Map([["EPS001", { id: epsId, name: "Salud Total", isActive: true }]]),
};

const existingAdult: AdultoMayorImportExistingRecord = {
  id: "44444444-4444-4444-8444-444444444444",
  documentType: "cc",
  documentNumber: "10000001",
  firstName: "Maria",
  middleName: null,
  firstSurname: "Gomez",
  secondSurname: null,
  birthDate: "1950-01-01",
  sex: "female",
  status: "alive",
  deathDate: null,
  educationLevel: null,
  disability: null,
  populationGroup: null,
  address: "Calle 1 # 2-3",
  departmentId,
  municipalityId,
  department: "Magdalena",
  municipality: "Santa Marta",
  zone: "urban",
  country: "Colombia",
  phone: "3000000000",
  phoneSecondary: null,
  email: "maria@example.com",
  emergencyContactFullName: null,
  emergencyContactRelationship: null,
  emergencyContactPhone: null,
  emergencyContactAddress: null,
  bloodType: "o_positive",
  sisben: "A1",
  healthRegime: "Subsidiado",
  epsId,
  eps: "Salud Total",
  livesWithSomeone: true,
  companion: "Ana",
  economicIncome: 150000,
  socialProgramBeneficiary: true,
  updatedAt: "2026-08-16T12:00:00.000Z",
};

function buildRow(
  overrides: Partial<AdultoMayorImportRowInput["values"]> = {},
): AdultoMayorImportRowInput {
  return {
    rowNumber: 2,
    values: {
      tipo_documento: "CC",
      numero_documento: "10000001",
      primer_nombre: "Maria",
      segundo_nombre: "",
      primer_apellido: "Gomez",
      segundo_apellido: "",
      fecha_nacimiento: "1950-01-01",
      sexo: "Femenino",
      estado: "",
      nivel_academico: "",
      discapacidad: "",
      grupo_poblacional: "",
      direccion: "Calle 1 # 2-3",
      codigo_departamento: "47",
      codigo_municipio: "47001",
      zona: "Urbana",
      pais: "",
      telefono: "",
      telefono_secundario: "",
      correo: "",
      contacto_emergencia_nombre: "",
      contacto_emergencia_parentesco: "",
      contacto_emergencia_telefono: "",
      contacto_emergencia_direccion: "",
      tipo_sangre: "",
      sisben: "",
      regimen_salud: "",
      codigo_eps: "",
      vive_con_alguien: "Si",
      acompanante: "",
      ingreso_economico: "",
      beneficiario_programa_social: "Si",
      ...overrides,
    },
  };
}

describe("AdultosMayoresImportValidator", () => {
  it("marks existing rows as update_ready and preserves optional blanks", () => {
    const row = buildRow({
      direccion: "Carrera 10 # 20-30",
    });

    const result = validator.validateRows([row], catalogs, [existingAdult]);
    const [validatedRow] = result.rows;

    assert.equal(validatedRow?.status, "update_ready");
    assert.equal(validatedRow?.existingAdultoId, existingAdult.id);
    assert.equal(validatedRow?.existingAdultoUpdatedAt, existingAdult.updatedAt);
    assert.equal(validatedRow?.normalizedPayload?.address, "Carrera 10 # 20-30");
    assert.equal(validatedRow?.normalizedPayload?.phone, existingAdult.phone);
    assert.equal(validatedRow?.normalizedPayload?.country, existingAdult.country);
    assert.equal(validatedRow?.normalizedPayload?.epsId, existingAdult.epsId);
    assert.equal(validatedRow?.normalizedPayload?.status, existingAdult.status);
    assert.equal(result.summary.updateRows, 1);
    assert.equal(result.summary.unchangedRows, 0);
    assert.equal(result.summary.existingRows, 1);
  });

  it("maps status for new imported adults", () => {
    const row = buildRow({
      numero_documento: "20000001",
      estado: "Fallecido",
      fecha_defuncion: "2026-01-15",
      telefono: "3001112233",
    });

    const result = validator.validateRows([row], catalogs, []);
    const [validatedRow] = result.rows;

    assert.equal(validatedRow?.status, "ready");
    assert.equal(validatedRow?.normalizedPayload?.status, "deceased");
    assert.equal(result.summary.readyRows, 1);
  });

  it("marks existing rows as update_ready when status changes", () => {
    const row = buildRow({
      estado: "Fallecido",
      fecha_defuncion: "2026-01-15",
    });

    const result = validator.validateRows([row], catalogs, [existingAdult]);
    const [validatedRow] = result.rows;

    assert.equal(validatedRow?.status, "update_ready");
    assert.equal(validatedRow?.normalizedPayload?.status, "deceased");
    assert.equal(result.summary.updateRows, 1);
  });

  it("marks rows as invalid when status has an unsupported value", () => {
    const row = buildRow({
      numero_documento: "20000002",
      estado: "Retirado",
    });

    const result = validator.validateRows([row], catalogs, []);
    const [validatedRow] = result.rows;

    assert.equal(validatedRow?.status, "invalid");
    assert.equal(validatedRow?.normalizedPayload, null);
    assert.equal(
      validatedRow?.issues.some((issue) => issue.column === "estado"),
      true,
    );
    assert.equal(result.summary.invalidRows, 1);
  });

  it("marks existing rows as unchanged when the effective payload does not vary", () => {
    const row = buildRow();

    const result = validator.validateRows([row], catalogs, [existingAdult]);
    const [validatedRow] = result.rows;

    assert.equal(validatedRow?.status, "unchanged");
    assert.equal(result.summary.readyRows, 0);
    assert.equal(result.summary.updateRows, 0);
    assert.equal(result.summary.unchangedRows, 1);
    assert.equal(result.summary.updatedRows, 0);
  });

  it("falls back to document number when the stored type differs but the document is unique", () => {
    const row = buildRow({
      tipo_documento: "CE",
      direccion: "Carrera 10 # 20-30",
    });

    const result = validator.validateRows([row], catalogs, [
      { ...existingAdult, documentType: "ce" },
    ]);
    const [validatedRow] = result.rows;

    assert.equal(validatedRow?.status, "update_ready");
    assert.equal(validatedRow?.existingAdultoId, existingAdult.id);
    assert.equal(result.summary.updateRows, 1);
    assert.equal(result.summary.existingRows, 1);
  });
});
