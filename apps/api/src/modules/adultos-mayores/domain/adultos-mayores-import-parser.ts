import ExcelJS from "exceljs";

import {
  adultoMayorImportIssueCodeSchema,
  adultoMayorImportIssueSeveritySchema,
} from "@cuidarte/contracts";

import {
  type AdultoMayorImportParsedWorkbook,
  type AdultoMayorImportRowInput,
  type AdultoMayorImportStructuralError,
} from "./adulto-mayor-import.types";

const TEMPLATE_KEY = "adultos-mayores-import";
const TEMPLATE_VERSION = 3;
const DATA_SHEET_NAME = "Adultos mayores";
const METADATA_SHEET_NAME = "_metadata";
const MAX_ROWS = 1_000;

const EXPECTED_HEADERS = [
  "tipo_documento",
  "numero_documento",
  "primer_nombre",
  "segundo_nombre",
  "primer_apellido",
  "segundo_apellido",
  "fecha_nacimiento",
  "sexo",
  "estado",
  "fecha_defuncion",
  "nivel_academico",
  "discapacidad",
  "grupo_poblacional",
  "direccion",
  "codigo_departamento",
  "codigo_municipio",
  "zona",
  "pais",
  "telefono",
  "telefono_secundario",
  "correo",
  "contacto_emergencia_nombre",
  "contacto_emergencia_parentesco",
  "contacto_emergencia_telefono",
  "contacto_emergencia_direccion",
  "tipo_sangre",
  "sisben",
  "regimen_salud",
  "codigo_eps",
  "vive_con_alguien",
  "acompanante",
  "ingreso_economico",
  "beneficiario_programa_social",
] as const;

export class AdultoMayorImportParseError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AdultoMayorImportParseError";
  }
}

export class AdultosMayoresImportParser {
  async parse(buffer: Buffer): Promise<AdultoMayorImportParsedWorkbook> {
    const workbook = new ExcelJS.Workbook();

    try {
      const workbookSource = buffer as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];
      await workbook.xlsx.load(workbookSource);
    } catch {
      throw new AdultoMayorImportParseError(
        "invalid_workbook",
        "El archivo no es un workbook valido.",
      );
    }

    const metadataSheet = this.getSingleWorksheet(workbook, METADATA_SHEET_NAME);
    const dataSheet = this.getSingleWorksheet(workbook, DATA_SHEET_NAME);
    const metadata = this.readMetadata(metadataSheet);
    const headers = this.readHeaders(dataSheet);
    this.ensureHeaders(headers);

    const rows = this.readRows(dataSheet, headers);

    return {
      templateKey: metadata.templateKey,
      templateVersion: metadata.templateVersion,
      generatedAt: metadata.generatedAt,
      rows,
    };
  }

  getExpectedHeaders(): readonly string[] {
    return EXPECTED_HEADERS;
  }

  getTemplateKey(): string {
    return TEMPLATE_KEY;
  }

  getTemplateVersion(): number {
    return TEMPLATE_VERSION;
  }

  private getSingleWorksheet(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
    const matches = workbook.worksheets.filter((worksheet) => worksheet.name === name);

    if (matches.length !== 1) {
      throw new AdultoMayorImportParseError(
        "invalid_sheet",
        `El archivo debe incluir exactamente una hoja llamada ${name}.`,
      );
    }

    return matches[0]!;
  }

  private readMetadata(sheet: ExcelJS.Worksheet): {
    templateKey: string;
    templateVersion: number;
    generatedAt: string | null;
  } {
    const metadata: Record<string, string> = {};

    sheet.eachRow({ includeEmpty: false }, (row) => {
      const key = this.getTextValue(row.getCell(1));
      const value = this.getTextValue(row.getCell(2));

      if (key !== null && value !== null) {
        metadata[key] = value;
      }
    });

    if (metadata.template_key === undefined || metadata.template_version === undefined) {
      throw new AdultoMayorImportParseError(
        "missing_metadata",
        "La plantilla no contiene metadata obligatoria.",
      );
    }

    const templateVersion = Number(metadata.template_version);

    if (!Number.isInteger(templateVersion) || templateVersion <= 0) {
      throw new AdultoMayorImportParseError(
        "invalid_metadata",
        "La version declarada de la plantilla no es valida.",
      );
    }

    return {
      templateKey: metadata.template_key,
      templateVersion,
      generatedAt: metadata.generated_at ?? null,
    };
  }

  private readHeaders(sheet: ExcelJS.Worksheet): string[] {
    const headerRow = sheet.getRow(1);
    const headers: string[] = [];

    for (let index = 1; index <= EXPECTED_HEADERS.length; index += 1) {
      const value = this.getTextValue(headerRow.getCell(index));

      if (value === null) {
        throw new AdultoMayorImportParseError(
          "missing_headers",
          "La hoja de datos no contiene los encabezados esperados.",
        );
      }

      headers.push(value);
    }

    return headers;
  }

  private ensureHeaders(headers: string[]): void {
    const expected = [...EXPECTED_HEADERS];

    if (headers.length !== expected.length) {
      throw new AdultoMayorImportParseError(
        "missing_headers",
        "La hoja de datos no contiene los encabezados esperados.",
      );
    }

    for (let index = 0; index < expected.length; index += 1) {
      if (headers[index] !== expected[index]) {
        throw new AdultoMayorImportParseError(
          "invalid_headers",
          "Los encabezados de la plantilla no coinciden con la version soportada.",
        );
      }
    }
  }

  private readRows(
    sheet: ExcelJS.Worksheet,
    headers: readonly string[],
  ): AdultoMayorImportRowInput[] {
    const rows: AdultoMayorImportRowInput[] = [];

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const values: Record<string, string | null> = {};
      let hasAnyValue = false;

      for (let columnIndex = 1; columnIndex <= headers.length; columnIndex += 1) {
        const value = this.getTextValue(row.getCell(columnIndex));
        const header = headers[columnIndex - 1];

        if (header === undefined) {
          continue;
        }

        values[header] = value;

        if (value !== null) {
          hasAnyValue = true;
        }
      }

      if (!hasAnyValue) {
        continue;
      }

      if (row.cellCount > headers.length) {
        for (let columnIndex = headers.length + 1; columnIndex <= row.cellCount; columnIndex += 1) {
          if (this.getTextValue(row.getCell(columnIndex)) !== null) {
            throw new AdultoMayorImportParseError(
              "unexpected_columns",
              "La plantilla contiene columnas inesperadas con contenido.",
            );
          }
        }
      }

      rows.push({
        rowNumber,
        values,
      });
    }

    if (rows.length === 0) {
      throw new AdultoMayorImportParseError(
        "empty_workbook",
        "La plantilla no contiene filas de datos.",
      );
    }

    if (rows.length > MAX_ROWS) {
      throw new AdultoMayorImportParseError(
        "too_many_rows",
        "El archivo supera el limite de 1.000 filas.",
      );
    }

    return rows;
  }

  private getTextValue(cell: ExcelJS.Cell): string | null {
    const rawValue = cell.value;

    if (rawValue === null || rawValue === undefined) {
      return null;
    }

    if (typeof rawValue === "object") {
      if ("formula" in rawValue && rawValue.formula !== undefined) {
        throw new AdultoMayorImportParseError(
          "formula_not_allowed",
          "Las formulas no se aceptan en la hoja de datos.",
        );
      }

      if (rawValue instanceof Date) {
        return rawValue.toISOString().slice(0, 10);
      }
    }

    const value = String(cell.text ?? rawValue).trim();

    return value === "" ? null : value;
  }
}

export function sanitizeImportIssue(
  issue: AdultoMayorImportStructuralError & {
    rowNumber?: number;
    column?: string;
    severity?: "error" | "warning";
    receivedValue?: string | null;
  },
): AdultoMayorImportStructuralError {
  adultoMayorImportIssueCodeSchema.parse(issue.code);
  adultoMayorImportIssueSeveritySchema.parse(issue.severity ?? "error");

  return {
    code: issue.code,
    message: issue.message,
  };
}
