import {
  type AdultoMayorImportIssue,
  adultoMayorBloodTypeSchema,
  adultoMayorCommandSchema,
  adultoMayorDocumentTypeSchema,
  adultoMayorHealthRegimeSchema,
  adultoMayorSexSchema,
  adultoMayorZoneSchema,
  adultoMayorImportIssueSchema,
  adultoMayorImportSummarySchema,
  createAdultoMayorRequestSchema,
} from "@cuidarte/contracts";

import { calculateAgeFromBirthDate } from "../application/age";
import {
  type AdultoMayorImportCatalogMaps,
  type AdultoMayorImportNormalizedRow,
  type AdultoMayorImportRowInput,
  type AdultoMayorImportValidatedRow,
} from "./adulto-mayor-import.types";

const REQUIRED_COLUMNS = new Set([
  "tipo_documento",
  "numero_documento",
  "primer_nombre",
  "primer_apellido",
  "fecha_nacimiento",
  "sexo",
  "direccion",
  "codigo_departamento",
  "codigo_municipio",
  "zona",
  "vive_con_alguien",
  "beneficiario_programa_social",
]);

const COLUMN_BY_PATH: Record<string, string> = {
  documentType: "tipo_documento",
  documentNumber: "numero_documento",
  firstName: "primer_nombre",
  middleName: "segundo_nombre",
  firstSurname: "primer_apellido",
  secondSurname: "segundo_apellido",
  birthDate: "fecha_nacimiento",
  sex: "sexo",
  educationLevel: "nivel_academico",
  disability: "discapacidad",
  populationGroup: "grupo_poblacional",
  address: "direccion",
  departmentId: "codigo_departamento",
  municipalityId: "codigo_municipio",
  zone: "zona",
  country: "pais",
  phone: "telefono",
  phoneSecondary: "telefono_secundario",
  email: "correo",
  emergencyContactFullName: "contacto_emergencia_nombre",
  emergencyContactRelationship: "contacto_emergencia_parentesco",
  emergencyContactPhone: "contacto_emergencia_telefono",
  emergencyContactAddress: "contacto_emergencia_direccion",
  bloodType: "tipo_sangre",
  sisben: "sisben",
  healthRegime: "regimen_salud",
  epsId: "codigo_eps",
  livesWithSomeone: "vive_con_alguien",
  companion: "acompanante",
  economicIncome: "ingreso_economico",
  socialProgramBeneficiary: "beneficiario_programa_social",
};

const DOCUMENT_TYPE_MAP: Record<string, AdultoMayorImportNormalizedRow["documentType"]> = {
  cc: "cc",
  cedula: "cc",
  cédula: "cc",
  ce: "ce",
  extranjeria: "ce",
  "cédula de extranjería": "ce",
  passport: "passport",
  pasaporte: "passport",
  other: "other",
  otro: "other",
};

const SEX_MAP: Record<string, AdultoMayorImportNormalizedRow["sex"]> = {
  femenino: "female",
  female: "female",
  masculino: "male",
  male: "male",
  otro: "other",
  other: "other",
};

const ZONE_MAP: Record<string, AdultoMayorImportNormalizedRow["zone"]> = {
  urbana: "urban",
  urban: "urban",
  rural: "rural",
};

const BOOLEAN_MAP: Record<string, boolean> = {
  si: true,
  sí: true,
  yes: true,
  no: false,
};

const BLOOD_TYPE_MAP: Record<string, AdultoMayorImportNormalizedRow["bloodType"]> = {
  "a+": "a_positive",
  "a-": "a_negative",
  "b+": "b_positive",
  "b-": "b_negative",
  "ab+": "ab_positive",
  "ab-": "ab_negative",
  "o+": "o_positive",
  "o-": "o_negative",
  desconocido: "unknown",
  unknown: "unknown",
};

export class AdultosMayoresImportValidator {
  validateRows(
    rows: AdultoMayorImportRowInput[],
    catalogs: AdultoMayorImportCatalogMaps,
    existingAdults: Array<{ id: string; documentType: string; documentNumber: string }>,
  ): {
    rows: AdultoMayorImportValidatedRow[];
    issues: AdultoMayorImportIssue[];
    summary: {
      totalRows: number;
      readyRows: number;
      invalidRows: number;
      warningRows: number;
      existingRows: number;
      createdRows: number;
    };
  } {
    const duplicateKeys = this.findDuplicateKeys(rows);
    const existingKeyMap = new Map(
      existingAdults.map((adulto) => [this.buildKey(adulto.documentType, adulto.documentNumber), adulto.id]),
    );

    const validatedRows = rows.map((row) =>
      this.validateRow(row, catalogs, duplicateKeys, existingKeyMap),
    );

    const allIssues = validatedRows.flatMap((row) => row.issues);
    const summary = adultoMayorImportSummarySchema.parse({
      totalRows: validatedRows.length,
      readyRows: validatedRows.filter((row) => row.status === "ready").length,
      invalidRows: validatedRows.filter((row) => row.status === "invalid").length,
      warningRows: validatedRows.filter(
        (row) => row.status !== "invalid" && row.issues.some((issue) => issue.severity === "warning"),
      ).length,
      existingRows: validatedRows.filter((row) => row.status === "existing").length,
      createdRows: 0,
    });

    return {
      rows: validatedRows,
      issues: allIssues,
      summary,
    };
  }

  private validateRow(
    row: AdultoMayorImportRowInput,
    catalogs: AdultoMayorImportCatalogMaps,
    duplicateKeys: Set<string>,
    existingKeyMap: Map<string, string>,
  ): AdultoMayorImportValidatedRow {
    const issues: AdultoMayorImportIssue[] = [];
    const normalized = this.normalizeRow(row, catalogs, issues);
    const key = this.buildKey(normalized.documentType, normalized.documentNumber);
    const duplicateInFile = duplicateKeys.has(key);
    const existingAdultoId = existingKeyMap.get(key) ?? null;

    if (duplicateInFile) {
      issues.push(
        this.issue(row.rowNumber, "numero_documento", "duplicate_in_file", "error", "El documento esta repetido dentro del mismo archivo.", normalized.documentNumber),
      );
    }

    if (existingAdultoId !== null) {
      return {
        rowNumber: row.rowNumber,
        status: "existing",
        normalizedPayload: normalized,
        issues,
        existingAdultoId,
      };
    }

    const hasError = issues.some((issue) => issue.severity === "error");

    return {
      rowNumber: row.rowNumber,
      status: hasError ? "invalid" : "ready",
      normalizedPayload: hasError ? null : normalized,
      issues,
      existingAdultoId: null,
    };
  }

  private normalizeRow(
    row: AdultoMayorImportRowInput,
    catalogs: AdultoMayorImportCatalogMaps,
    issues: AdultoMayorImportIssue[],
  ): AdultoMayorImportNormalizedRow {
    const eps = this.mapEps(row, catalogs, issues);
    const department = this.mapDepartment(row, catalogs, issues);
    const municipality = this.mapMunicipality(row, catalogs, issues);
    const payload = {
      documentType: this.mapDocumentType(row, issues),
      documentNumber: this.requiredText(row, "numero_documento", 80, issues),
      firstName: this.requiredText(row, "primer_nombre", 80, issues),
      middleName: this.optionalText(row, "segundo_nombre", 80, issues),
      firstSurname: this.requiredText(row, "primer_apellido", 80, issues),
      secondSurname: this.optionalText(row, "segundo_apellido", 80, issues),
      birthDate: this.mapBirthDate(row, issues),
      sex: this.mapSex(row, issues),
      educationLevel: this.catalogText(row, "nivel_academico", 80, issues),
      disability: this.catalogText(row, "discapacidad", 120, issues),
      populationGroup: this.catalogText(row, "grupo_poblacional", 120, issues),
      address: this.requiredText(row, "direccion", 220, issues),
      departmentId: department.id,
      municipalityId: municipality.id,
      department: department.name,
      municipality: municipality.name,
      zone: this.mapZone(row, issues),
      country: this.optionalText(row, "pais", 80, issues) ?? "Colombia",
      phone: this.optionalText(row, "telefono", 40, issues),
      phoneSecondary: this.optionalText(row, "telefono_secundario", 40, issues),
      email: this.optionalEmail(row, issues),
      emergencyContactFullName: this.optionalText(row, "contacto_emergencia_nombre", 180, issues),
      emergencyContactRelationship: this.optionalText(
        row,
        "contacto_emergencia_parentesco",
        80,
        issues,
      ),
      emergencyContactPhone: this.optionalText(row, "contacto_emergencia_telefono", 40, issues),
      emergencyContactAddress: this.optionalText(row, "contacto_emergencia_direccion", 220, issues),
      bloodType: this.mapBloodType(row, issues),
      sisben: this.optionalText(row, "sisben", 40, issues),
      healthRegime: this.catalogText(row, "regimen_salud", 120, issues),
      epsId: eps?.id ?? null,
      eps: eps?.name ?? null,
      livesWithSomeone: this.mapBoolean(row, "vive_con_alguien", issues),
      companion: this.optionalText(row, "acompanante", 160, issues),
      economicIncome: this.optionalInteger(row, "ingreso_economico", 999_999_999, issues),
      socialProgramBeneficiary: this.mapBoolean(row, "beneficiario_programa_social", issues),
    } satisfies AdultoMayorImportNormalizedRow;

    const parsed = createAdultoMayorRequestSchema.safeParse({
      ...payload,
      tenantId: null,
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const column = COLUMN_BY_PATH[issue.path[0]?.toString() ?? ""] ?? "archivo";
        issues.push(
          this.issue(
            row.rowNumber,
            column,
            this.mapSchemaIssueCode(issue.code),
            "error",
            this.schemaMessage(issue.message, column),
            this.receivedValueFor(row, column),
          ),
        );
      }
    }

    const age = calculateAgeFromBirthDate(payload.birthDate);

    if (age < 60) {
      issues.push(
        this.issue(
          row.rowNumber,
          "fecha_nacimiento",
          "under_expected_age",
          "warning",
          "La persona tiene menos de 60 anos y requiere revision.",
          payload.birthDate,
        ),
      );
    }

    const companion = payload.companion?.trim() ?? null;
    if (payload.livesWithSomeone && companion === null) {
      issues.push(
        this.issue(
          row.rowNumber,
          "acompanante",
          "invalid_format",
          "warning",
          "Indicaste que vive con alguien, pero no diligenciaste acompanante.",
          null,
        ),
      );
    }

    if (!payload.livesWithSomeone && companion !== null) {
      issues.push(
        this.issue(
          row.rowNumber,
          "acompanante",
          "invalid_format",
          "warning",
          "Se diligencio acompanante aunque el campo indica que no vive con alguien.",
          companion,
        ),
      );
    }

    return payload;
  }

  private mapDocumentType(row: AdultoMayorImportRowInput, issues: AdultoMayorImportIssue[]) {
    const raw = this.requiredText(row, "tipo_documento", 40, issues);
    const key = this.normalizeLookup(raw);
    const documentType = DOCUMENT_TYPE_MAP[key];

    if (documentType === undefined) {
      issues.push(this.issue(row.rowNumber, "tipo_documento", "invalid_enum", "error", "Tipo de documento invalido.", raw));
      return "cc";
    }

    return documentType;
  }

  private mapSex(row: AdultoMayorImportRowInput, issues: AdultoMayorImportIssue[]) {
    const raw = this.requiredText(row, "sexo", 40, issues);
    const sex = SEX_MAP[this.normalizeLookup(raw)];

    if (sex === undefined) {
      issues.push(this.issue(row.rowNumber, "sexo", "invalid_enum", "error", "Sexo invalido.", raw));
      return "female";
    }

    return sex;
  }

  private mapZone(row: AdultoMayorImportRowInput, issues: AdultoMayorImportIssue[]) {
    const raw = this.requiredText(row, "zona", 40, issues);
    const zone = ZONE_MAP[this.normalizeLookup(raw)];

    if (zone === undefined) {
      issues.push(this.issue(row.rowNumber, "zona", "invalid_enum", "error", "Zona invalida.", raw));
      return "urban";
    }

    return zone;
  }

  private mapBoolean(
    row: AdultoMayorImportRowInput,
    column: string,
    issues: AdultoMayorImportIssue[],
  ): boolean {
    const raw = this.requiredText(row, column, 40, issues);
    const mapped = BOOLEAN_MAP[this.normalizeLookup(raw)];

    if (mapped === undefined) {
      issues.push(this.issue(row.rowNumber, column, "invalid_enum", "error", "El valor debe ser Si o No.", raw));
      return false;
    }

    return mapped;
  }

  private mapBloodType(row: AdultoMayorImportRowInput, issues: AdultoMayorImportIssue[]) {
    const raw = this.optionalText(row, "tipo_sangre", 20, issues);

    if (raw === null) {
      return null;
    }

    const bloodType = BLOOD_TYPE_MAP[this.normalizeLookup(raw)];

    if (bloodType === undefined) {
      issues.push(this.issue(row.rowNumber, "tipo_sangre", "invalid_enum", "error", "Tipo de sangre invalido.", raw));
      return null;
    }

    adultoMayorBloodTypeSchema.parse(bloodType);
    return bloodType;
  }

  private mapDepartment(
    row: AdultoMayorImportRowInput,
    catalogs: AdultoMayorImportCatalogMaps,
    issues: AdultoMayorImportIssue[],
  ): { id: string; name: string } {
    const raw = this.requiredText(row, "codigo_departamento", 10, issues);
    const department = catalogs.departmentsByCode.get(raw);

    if (department === undefined) {
      issues.push(
        this.issue(row.rowNumber, "codigo_departamento", "unknown_department", "error", "Departamento no encontrado o inactivo.", raw),
      );
      return { id: "", name: "" };
    }

    return department;
  }

  private mapMunicipality(
    row: AdultoMayorImportRowInput,
    catalogs: AdultoMayorImportCatalogMaps,
    issues: AdultoMayorImportIssue[],
  ): { id: string; departmentId: string; name: string } {
    const raw = this.requiredText(row, "codigo_municipio", 10, issues);
    const municipality = catalogs.municipalitiesByCode.get(raw);

    if (municipality === undefined) {
      issues.push(
        this.issue(row.rowNumber, "codigo_municipio", "unknown_municipality", "error", "Municipio no encontrado o inactivo.", raw),
      );
      return { id: "", departmentId: "", name: "" };
    }

    const department = catalogs.departmentsByCode.get(row.values.codigo_departamento ?? "");
    if (department !== undefined && municipality.departmentId !== department.id) {
      issues.push(
        this.issue(
          row.rowNumber,
          "codigo_municipio",
          "municipality_department_mismatch",
          "error",
          "El municipio no pertenece al departamento seleccionado.",
          raw,
        ),
      );
    }

    return municipality;
  }

  private mapEps(
    row: AdultoMayorImportRowInput,
    catalogs: AdultoMayorImportCatalogMaps,
    issues: AdultoMayorImportIssue[],
  ) {
    const raw = this.optionalText(row, "codigo_eps", 40, issues);

    if (raw === null) {
      return null;
    }

    const eps = catalogs.epsByCode.get(raw);

    if (eps === undefined) {
      issues.push(this.issue(row.rowNumber, "codigo_eps", "unknown_eps", "error", "La EPS no existe.", raw));
      return null;
    }

    if (!eps.isActive) {
      issues.push(this.issue(row.rowNumber, "codigo_eps", "inactive_eps", "error", "La EPS seleccionada no se encuentra activa.", raw));
      return null;
    }

    return { id: eps.id, name: eps.name };
  }

  private mapBirthDate(row: AdultoMayorImportRowInput, issues: AdultoMayorImportIssue[]): string {
    const raw = this.requiredText(row, "fecha_nacimiento", 20, issues);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      issues.push(this.issue(row.rowNumber, "fecha_nacimiento", "invalid_format", "error", "La fecha debe tener formato YYYY-MM-DD.", raw));
      return "1900-01-01";
    }

    const parsed = new Date(`${raw}T00:00:00.000Z`);

    if (Number.isNaN(parsed.getTime())) {
      issues.push(this.issue(row.rowNumber, "fecha_nacimiento", "invalid_format", "error", "La fecha de nacimiento no es valida.", raw));
      return "1900-01-01";
    }

    const today = new Date();
    const todayIso = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    if (parsed > todayIso) {
      issues.push(this.issue(row.rowNumber, "fecha_nacimiento", "future_date", "error", "La fecha de nacimiento no puede estar en el futuro.", raw));
    }

    return raw;
  }

  private optionalEmail(row: AdultoMayorImportRowInput, issues: AdultoMayorImportIssue[]): string | null {
    const raw = row.values.correo ?? null;

    if (raw === null) {
      return null;
    }

    const value = raw.trim().toLowerCase();

    if (value === "") {
      return null;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      issues.push(this.issue(row.rowNumber, "correo", "invalid_format", "error", "El correo no es valido.", raw));
      return null;
    }

    return value;
  }

  private requiredText(
    row: AdultoMayorImportRowInput,
    column: string,
    maxLength: number,
    issues: AdultoMayorImportIssue[],
  ): string {
    const raw = row.values[column] ?? null;

    if (raw === null || raw.trim() === "") {
      issues.push(this.issue(row.rowNumber, column, "required", "error", "El campo es obligatorio.", raw));
      return "";
    }

    const value = raw.trim();

    if (value.length > maxLength) {
      issues.push(this.issue(row.rowNumber, column, "max_length", "error", `El campo admite maximo ${maxLength} caracteres.`, raw));
      return value.slice(0, maxLength);
    }

    return value;
  }

  private optionalText(
    row: AdultoMayorImportRowInput,
    column: string,
    maxLength: number,
    issues: AdultoMayorImportIssue[],
  ): string | null {
    const raw = row.values[column] ?? null;

    if (raw === null) {
      return null;
    }

    const value = raw.trim();

    if (value === "") {
      return null;
    }

    if (value.length > maxLength) {
      issues.push(this.issue(row.rowNumber, column, "max_length", "error", `El campo admite maximo ${maxLength} caracteres.`, raw));
      return value.slice(0, maxLength);
    }

    return value;
  }

  private catalogText(
    row: AdultoMayorImportRowInput,
    column: string,
    maxLength: number,
    issues: AdultoMayorImportIssue[],
  ): string | null {
    const value = this.optionalText(row, column, maxLength, issues);

    if (value === null) {
      return null;
    }

    return this.normalizeCatalogValue(value);
  }

  private optionalInteger(
    row: AdultoMayorImportRowInput,
    column: string,
    maxValue: number,
    issues: AdultoMayorImportIssue[],
  ): number | null {
    const raw = row.values[column] ?? null;

    if (raw === null || raw.trim() === "") {
      return null;
    }

    if (!/^\d+$/.test(raw.trim())) {
      issues.push(this.issue(row.rowNumber, column, "invalid_format", "error", "Debe ser un numero entero.", raw));
      return null;
    }

    const value = Number(raw.trim());

    if (!Number.isInteger(value) || value < 0 || value > maxValue) {
      issues.push(this.issue(row.rowNumber, column, "invalid_format", "error", "El numero esta fuera de rango.", raw));
      return null;
    }

    return value;
  }

  private findDuplicateKeys(rows: AdultoMayorImportRowInput[]): Set<string> {
    const counts = new Map<string, number>();

    for (const row of rows) {
      const type = this.normalizeLookup(row.values.tipo_documento ?? "");
      const number = (row.values.numero_documento ?? "").trim();

      if (type === "" || number === "") {
        continue;
      }

      const key = this.buildKey(DOCUMENT_TYPE_MAP[type] ?? type, number);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
  }

  private buildKey(documentType: string, documentNumber: string): string {
    return `${documentType}::${documentNumber.trim()}`;
  }

  private normalizeLookup(value: string): string {
    return this.normalizeCatalogValue(value);
  }

  private normalizeCatalogValue(value: string): string {
    return value
      .trim()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  private mapSchemaIssueCode(code: string): AdultoMayorImportIssue["code"] {
    switch (code) {
      case "too_small":
      case "invalid_type":
        return "required";
      case "invalid_string":
        return "invalid_format";
      default:
        return "invalid_format";
    }
  }

  private schemaMessage(message: string, column: string): string {
    if (message.trim() !== "") {
      return message;
    }

    return `El campo ${column} no es valido.`;
  }

  private receivedValueFor(row: AdultoMayorImportRowInput, column: string): string | null {
    const value = row.values[column] ?? null;

    if (value === null) {
      return null;
    }

    return value.slice(0, 400);
  }

  private issue(
    rowNumber: number,
    column: string,
    code: AdultoMayorImportIssue["code"],
    severity: AdultoMayorImportIssue["severity"],
    message: string,
    receivedValue: string | null,
  ): AdultoMayorImportIssue {
    return adultoMayorImportIssueSchema.parse({
      rowNumber,
      column,
      code,
      severity,
      message,
      receivedValue: receivedValue === null ? null : receivedValue.slice(0, 400),
    });
  }
}
