import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  type AdultoMayorImportCatalogMaps,
  type AdultoMayorImportExistingAdultRecord,
  type AdultoMayorImportRowInput,
} from "./adulto-mayor-import.types";
import { AdultosMayoresImportValidator } from "./adultos-mayores-import-validator";

const departmentId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const municipalityId = "1488c239-6cb1-4125-988a-734cd39d13d3";
const adultoId = "9f75c51f-74ab-40b7-84ef-9e4a93d14af1";
const existingUpdatedAt = new Date("2026-08-11T12:00:00.000Z");

describe("AdultosMayoresImportValidator", () => {
  const validator = new AdultosMayoresImportValidator();

  it("clasifica como sin cambios y conserva campos opcionales vacios", () => {
    const result = validator.validateRows([createRow()], createCatalogs(), [createExistingAdult()]);
    const [row] = result.rows;

    assert.equal(row?.status, "unchanged");
    assert.equal(row?.normalizedPayload?.middleName, "Maria");
    assert.equal(row?.normalizedPayload?.phone, "3001234567");
    assert.equal(row?.existingAdultoId, adultoId);
    assert.equal(row?.existingAdultoUpdatedAt, existingUpdatedAt);
    assert.deepEqual(result.summary, {
      totalRows: 1,
      readyRows: 0,
      invalidRows: 0,
      warningRows: 0,
      existingRows: 1,
      updateRows: 0,
      updatedRows: 0,
      unchangedRows: 1,
      createdRows: 0,
    });
  });

  it("clasifica como actualizacion cuando cambia un dato mutable", () => {
    const result = validator.validateRows(
      [createRow({ direccion: "Carrera 20 # 30-40" })],
      createCatalogs(),
      [createExistingAdult()],
    );
    const [row] = result.rows;

    assert.equal(row?.status, "update_ready");
    assert.equal(row?.normalizedPayload?.address, "Carrera 20 # 30-40");
    assert.equal(row?.normalizedPayload?.phone, "3001234567");
    assert.equal(result.summary.updateRows, 1);
    assert.equal(result.summary.unchangedRows, 0);
  });

  it("no permite que un registro existente invalido evite los errores de fila", () => {
    const result = validator.validateRows(
      [createRow({ correo: "correo-invalido" })],
      createCatalogs(),
      [createExistingAdult()],
    );
    const [row] = result.rows;

    assert.equal(row?.status, "invalid");
    assert.equal(row?.normalizedPayload, null);
    assert.equal(row?.existingAdultoId, adultoId);
    assert.ok(row?.issues.some((issue) => issue.column === "correo"));
  });

  it("mantiene como creacion una persona que no existe en el centro", () => {
    const result = validator.validateRows([createRow()], createCatalogs(), []);

    assert.equal(result.rows[0]?.status, "ready");
    assert.equal(result.summary.readyRows, 1);
    assert.equal(result.summary.existingRows, 0);
  });
});

function createCatalogs(): AdultoMayorImportCatalogMaps {
  return {
    departmentsByCode: new Map([["05", { id: departmentId, name: "Antioquia" }]]),
    municipalitiesByCode: new Map([
      ["05001", { id: municipalityId, departmentId, name: "Medellin" }],
    ]),
    epsByCode: new Map(),
  };
}

function createRow(overrides: Record<string, string | null> = {}): AdultoMayorImportRowInput {
  return {
    rowNumber: 8,
    values: {
      tipo_documento: "CC",
      numero_documento: "123456789",
      primer_nombre: "Ana",
      segundo_nombre: null,
      primer_apellido: "Perez",
      segundo_apellido: null,
      fecha_nacimiento: "1950-01-15",
      sexo: "Femenino",
      direccion: "Calle 10 # 20-30",
      codigo_departamento: "05",
      codigo_municipio: "05001",
      zona: "Urbana",
      pais: null,
      telefono: null,
      correo: null,
      vive_con_alguien: "No",
      beneficiario_programa_social: "No",
      ...overrides,
    },
  };
}

function createExistingAdult(): AdultoMayorImportExistingAdultRecord {
  return {
    id: adultoId,
    documentType: "cc",
    documentNumber: "123456789",
    firstName: "Ana",
    middleName: "Maria",
    firstSurname: "Perez",
    secondSurname: null,
    birthDate: "1950-01-15",
    sex: "female",
    educationLevel: null,
    disability: null,
    populationGroup: null,
    address: "Calle 10 # 20-30",
    departmentId,
    municipalityId,
    department: "Antioquia",
    municipality: "Medellin",
    zone: "urban",
    country: "Colombia",
    phone: "3001234567",
    phoneSecondary: null,
    email: null,
    emergencyContactFullName: null,
    emergencyContactRelationship: null,
    emergencyContactPhone: null,
    emergencyContactAddress: null,
    bloodType: null,
    sisben: null,
    healthRegime: null,
    epsId: null,
    eps: null,
    livesWithSomeone: false,
    companion: null,
    economicIncome: null,
    socialProgramBeneficiary: false,
    updatedAt: existingUpdatedAt,
  };
}
