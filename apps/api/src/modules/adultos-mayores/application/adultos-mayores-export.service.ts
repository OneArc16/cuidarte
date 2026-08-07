import {
  type AdultoMayorListItem,
  type AdultoMayorListQuery,
  type AuthUser,
} from "@cuidarte/contracts";
import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import { chromium } from "playwright";

import { AdultosMayoresService } from "./adultos-mayores.service";
import playwrightEnv from "../../../common/playwright-env";

export type ExportedAdultosMayoresFile = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

@Injectable()
export class AdultosMayoresExportService {
  constructor(private readonly adultosMayoresService: AdultosMayoresService) {}

  async exportExcel(
    query: AdultoMayorListQuery,
    actor: AuthUser,
  ): Promise<ExportedAdultosMayoresFile> {
    const adultosMayores = await this.adultosMayoresService.listAdultosMayores(query, actor);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Adultos mayores");
    const includeTenant = actor.role === "super_admin";

    workbook.creator = "CuidarTe";
    workbook.created = new Date();
    worksheet.columns = this.getExcelColumns(includeTenant);
    worksheet.addRows(
      adultosMayores.map((adultoMayor) => this.toExportRow(adultoMayor, includeTenant)),
    );
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF085041" },
    };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    for (const column of worksheet.columns) {
      column.alignment = { vertical: "middle", wrapText: true };
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(buffer),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: "adultos-mayores.xlsx",
    };
  }

  async exportPdf(
    query: AdultoMayorListQuery,
    actor: AuthUser,
  ): Promise<ExportedAdultosMayoresFile> {
    const adultosMayores = await this.adultosMayoresService.listAdultosMayores(query, actor);
    const includeTenant = actor.role === "super_admin";

    try {
      return {
        buffer: await this.renderPdfWithPlaywright(adultosMayores, includeTenant),
        contentType: "application/pdf",
        filename: "adultos-mayores.pdf",
      };
    } catch {
      return {
        buffer: buildBasicPdf(adultosMayores, includeTenant),
        contentType: "application/pdf",
        filename: "adultos-mayores.pdf",
      };
    }
  }

  private async renderPdfWithPlaywright(
    adultosMayores: AdultoMayorListItem[],
    includeTenant: boolean,
  ): Promise<Buffer> {
    const browser = await chromium.launch({ headless: true, env: playwrightEnv.createPlaywrightLaunchEnv() });

    try {
      const page = await browser.newPage();
      await page.setContent(this.buildPdfHtml(adultosMayores, includeTenant), {
        waitUntil: "load",
      });

      return await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: {
          top: "18mm",
          right: "14mm",
          bottom: "16mm",
          left: "14mm",
        },
      });
    } finally {
      await browser.close();
    }
  }

  private getExcelColumns(includeTenant: boolean): Partial<ExcelJS.Column>[] {
    const columns: Partial<ExcelJS.Column>[] = [
      { header: "Documento", key: "documento", width: 18 },
      { header: "Nombres", key: "nombres", width: 24 },
      { header: "Apellidos", key: "apellidos", width: 24 },
      { header: "Telefono", key: "telefono", width: 18 },
      { header: "Edad", key: "edad", width: 10 },
      { header: "Sexo", key: "sexo", width: 14 },
    ];

    if (includeTenant) {
      return [{ header: "Centro", key: "centro", width: 28 }, ...columns];
    }

    return columns;
  }

  private toExportRow(
    adultoMayor: AdultoMayorListItem,
    includeTenant: boolean,
  ): Record<string, string | number> {
    const row = {
      documento: formatDocument(adultoMayor.documentType, adultoMayor.documentNumber),
      nombres: adultoMayor.names,
      apellidos: adultoMayor.surnames,
      telefono: adultoMayor.phone ?? "Sin telefono",
      edad: adultoMayor.age,
      sexo: formatSex(adultoMayor.sex),
    };

    if (!includeTenant) {
      return row;
    }

    return {
      centro: adultoMayor.tenantName,
      ...row,
    };
  }

  private buildPdfHtml(adultosMayores: AdultoMayorListItem[], includeTenant: boolean): string {
    const tenantHeader = includeTenant ? "<th>Centro</th>" : "";
    const rows = adultosMayores
      .map((adultoMayor) => {
        const tenantCell = includeTenant ? `<td>${escapeHtml(adultoMayor.tenantName)}</td>` : "";

        return `<tr>
          ${tenantCell}
          <td>${escapeHtml(formatDocument(adultoMayor.documentType, adultoMayor.documentNumber))}</td>
          <td>${escapeHtml(adultoMayor.names)}</td>
          <td>${escapeHtml(adultoMayor.surnames)}</td>
          <td>${escapeHtml(adultoMayor.phone ?? "Sin telefono")}</td>
          <td>${adultoMayor.age}</td>
          <td>${escapeHtml(formatSex(adultoMayor.sex))}</td>
        </tr>`;
      })
      .join("");

    return `<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Adultos mayores</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #15372f;
              font-family: Arial, sans-serif;
              font-size: 12px;
            }
            header {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              margin-bottom: 20px;
              border-bottom: 2px solid #1D9E75;
              padding-bottom: 12px;
            }
            h1 {
              margin: 0;
              color: #085041;
              font-size: 28px;
              line-height: 1;
            }
            p {
              margin: 6px 0 0;
              color: #667771;
              font-weight: 700;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th {
              background: #085041;
              color: white;
              font-size: 10px;
              letter-spacing: 0;
              text-align: left;
              text-transform: uppercase;
            }
            th, td {
              border: 1px solid #dce8e4;
              padding: 8px;
              vertical-align: top;
            }
            tbody tr:nth-child(even) td { background: #f7fcfa; }
          </style>
        </head>
        <body>
          <header>
            <div>
              <h1>Adultos mayores</h1>
              <p>Listado operativo de CuidarTe</p>
            </div>
            <p>${new Date().toLocaleDateString("es-CO")}</p>
          </header>
          <table>
            <thead>
              <tr>
                ${tenantHeader}
                <th>Documento</th>
                <th>Nombres</th>
                <th>Apellidos</th>
                <th>Telefono</th>
                <th>Edad</th>
                <th>Sexo</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>`;
  }
}

function formatDocument(
  documentType: AdultoMayorListItem["documentType"],
  documentNumber: string,
): string {
  const typeLabels: Record<AdultoMayorListItem["documentType"], string> = {
    cc: "CC",
    ce: "CE",
    passport: "Pasaporte",
    other: "Otro",
  };

  return `${typeLabels[documentType]} ${documentNumber}`;
}

function formatSex(sex: AdultoMayorListItem["sex"]): string {
  const sexLabels: Record<AdultoMayorListItem["sex"], string> = {
    female: "Femenino",
    male: "Masculino",
    other: "Otro",
  };

  return sexLabels[sex];
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character] ?? character;
  });
}

function buildBasicPdf(adultosMayores: AdultoMayorListItem[], includeTenant: boolean): Buffer {
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 34;
  const rowHeight = 22;
  const rows = adultosMayores.map((adultoMayor) => toPdfRow(adultoMayor, includeTenant));
  const headers = includeTenant
    ? ["Centro", "Documento", "Nombres", "Apellidos", "Telefono", "Edad", "Sexo"]
    : ["Documento", "Nombres", "Apellidos", "Telefono", "Edad", "Sexo"];
  const columns = includeTenant ? [135, 104, 122, 122, 96, 46, 76] : [125, 150, 150, 122, 52, 86];
  const pages: string[] = [];
  let cursor = 0;

  while (cursor < rows.length || pages.length === 0) {
    const commands: string[] = [];
    let y = pageHeight - margin;

    drawText(commands, "Adultos mayores", margin, y, 21, "F2");
    drawText(
      commands,
      `Generado: ${new Date().toLocaleDateString("es-CO")}`,
      pageWidth - 190,
      y,
      9,
      "F1",
    );
    y -= 32;
    drawTableHeader(commands, headers, columns, margin, y);
    y -= rowHeight;

    while (cursor < rows.length && y > margin + rowHeight) {
      drawTableRow(commands, rows[cursor] ?? [], columns, margin, y);
      y -= rowHeight;
      cursor += 1;
    }

    pages.push(commands.join("\n"));
  }

  return createPdfDocument(pages, pageWidth, pageHeight);
}

function toPdfRow(adultoMayor: AdultoMayorListItem, includeTenant: boolean): string[] {
  const row = [
    formatDocument(adultoMayor.documentType, adultoMayor.documentNumber),
    adultoMayor.names,
    adultoMayor.surnames,
    adultoMayor.phone ?? "Sin telefono",
    String(adultoMayor.age),
    formatSex(adultoMayor.sex),
  ];

  return includeTenant ? [adultoMayor.tenantName, ...row] : row;
}

function drawTableHeader(
  commands: string[],
  headers: string[],
  columns: number[],
  x: number,
  y: number,
): void {
  commands.push("0.93 0.97 0.95 rg");
  commands.push(`${formatNumber(x)} ${formatNumber(y - 5)} ${formatNumber(sum(columns))} 20 re f`);
  commands.push("0 g");
  drawTableRow(commands, headers, columns, x, y, "F2");
}

function drawTableRow(
  commands: string[],
  values: string[],
  columns: number[],
  x: number,
  y: number,
  font: "F1" | "F2" = "F1",
): void {
  let currentX = x;

  for (let index = 0; index < columns.length; index += 1) {
    drawText(
      commands,
      truncatePdfText(values[index] ?? "", columns[index] ?? 80),
      currentX + 5,
      y,
      8,
      font,
    );
    currentX += columns[index] ?? 0;
  }

  commands.push("0.82 0.88 0.86 RG");
  commands.push(
    `${formatNumber(x)} ${formatNumber(y - 7)} m ${formatNumber(x + sum(columns))} ${formatNumber(y - 7)} l S`,
  );
  commands.push("0 g");
}

function drawText(
  commands: string[],
  value: string,
  x: number,
  y: number,
  size: number,
  font: "F1" | "F2",
): void {
  commands.push(
    `BT /${font} ${size} Tf ${formatNumber(x)} ${formatNumber(y)} Td (${escapePdfText(value)}) Tj ET`,
  );
}

function createPdfDocument(pageStreams: string[], pageWidth: number, pageHeight: number): Buffer {
  const objects: string[] = [
    "",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  const pageObjectIds: number[] = [];

  for (const stream of pageStreams) {
    const content = `q\n${stream}\nQ`;
    const contentObjectId = objects.length + 1;
    objects.push(
      `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
    );
    const pageObjectId = objects.length + 1;
    pageObjectIds.push(pageObjectId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${formatNumber(pageWidth)} ${formatNumber(
        pageHeight,
      )}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
  }

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${
    pageObjectIds.length
  } >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "utf8");
}

function escapePdfText(value: string): string {
  return normalizePdfText(value).replace(/[\\()]/g, (character) => `\\${character}`);
}

function normalizePdfText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function truncatePdfText(value: string, width: number): string {
  const maxCharacters = Math.max(8, Math.floor(width / 5.2));
  const normalizedValue = normalizePdfText(value);

  return normalizedValue.length > maxCharacters
    ? `${normalizedValue.slice(0, Math.max(0, maxCharacters - 1))}.`
    : normalizedValue;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function formatNumber(value: number): string {
  return value.toFixed(2).replace(/\.00$/, "");
}
