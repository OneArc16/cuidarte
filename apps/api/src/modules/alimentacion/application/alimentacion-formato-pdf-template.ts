import { type AlimentacionFormatoEntregaExportData } from "./alimentacion-formato-export.types";
import {
  buildFormatoEntregaVisitBlocks,
  type AlimentacionFormatoEntregaVisitBlock,
  type AlimentacionFormatoEntregaVisitSlot,
} from "./alimentacion-formato-visit-slots";

const STUBS_PER_PAGE = 2;
const FIXED_LUGAR_LABEL = "CENTRO DE VIDA DEL ADULTO MAYOR";
const HEADER_TITLE = "Formato de Entrega de Alimentos y Auxilio de Transporte";
const ACTIVITY_DESCRIPTION_TITLE = "Descripcion de la actividad semanal";
const ACTIVITY_DESCRIPTION_VALUE = "Entrega de alimentos";

type BuildFormatoEntregaPdfHtmlParams = {
  data: AlimentacionFormatoEntregaExportData;
  generatedAt: Date;
  institutionalLogoDataUrl: string | null;
  tenantLogoDataUrl: string;
  directorSignatureDataUrl: string | null;
};

export function buildFormatoEntregaPdfFilename(
  documentNumber: string,
  deliveryMonth: string,
): string {
  const sanitizedDocument = documentNumber.replace(/[^a-zA-Z0-9._-]/g, "-");

  return `formato-entrega-${sanitizedDocument}-${deliveryMonth}.pdf`;
}

export function buildFormatoEntregaPdfHtml({
  data,
  generatedAt,
  institutionalLogoDataUrl,
  tenantLogoDataUrl,
  directorSignatureDataUrl,
}: BuildFormatoEntregaPdfHtmlParams): string {
  const visitBlocks = buildFormatoEntregaVisitBlocks(data.records);
  const generatedDateLabel = formatBogotaDate(generatedAt);
  const cityLabel = formatTenantCityLabel(data.tenantCity, data.tenantDepartment);
  const stubSections = buildPageHtml({
    visitBlocks,
    generatedDateLabel,
    cityLabel,
    directorSignatureDataUrl,
    fullName: data.fullName,
    documentNumber: data.documentNumber,
    institutionalLogoDataUrl,
    tenantLogoDataUrl,
    tenantName: data.tenantName,
  });

  return `<!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(HEADER_TITLE)}</title>
        <style>
          * { box-sizing: border-box; }
          @page {
            size: A4 portrait;
            margin: 9mm 8mm;
          }
          body {
            margin: 0;
            color: #111;
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.1;
          }
          .page {
            display: grid;
            gap: 7mm;
          }
          .page + .page {
            break-before: page;
            page-break-before: always;
          }
          .stub {
            border: 1px solid #111;
          }
          .stub-header {
            display: grid;
            grid-template-columns: 110px minmax(0, 1fr) 110px;
            align-items: center;
            justify-content: space-between;
            min-height: 32px;
            padding: 2px 8px;
            border-bottom: 1px solid #111;
          }
          .stub-header-title {
            text-align: center;
            font-size: 12px;
            font-weight: 500;
          }
          .stub-logo {
            width: 110px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .stub-logo img {
            display: block;
            width: 100%;
            height: 100%;
            max-height: 24px;
            max-width: 100%;
            object-fit: contain;
          }
          .stub-logo-fallback {
            color: #4f5e59;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          .meta-table,
          .products-table {
            width: 100%;
            border-collapse: collapse;
          }
          .meta-table td,
          .products-table th,
          .products-table td {
            border: 1px solid #111;
            padding: 2px 4px;
          }
          .meta-table td:first-child {
            width: 85px;
            font-weight: 700;
          }
          .meta-table td:last-child {
            text-align: center;
          }
          .products-table {
            margin-top: 4px;
            table-layout: fixed;
          }
          .products-table th {
            font-weight: 500;
            text-align: center;
          }
          .products-table .product-label {
            width: 140px;
            text-align: left;
            font-weight: 500;
          }
          .products-table .day-label {
            width: calc((100% - 140px) / 12);
            font-size: 10px;
            line-height: 1.05;
          }
          .products-table .status-cell {
            height: 20px;
            text-align: center;
            vertical-align: middle;
            font-weight: 700;
          }
          .activity {
            margin-top: 4px;
            border: 1px solid #111;
          }
          .activity-title {
            border-bottom: 1px solid #111;
            padding: 2px 4px;
            font-weight: 500;
          }
          .activity-value {
            min-height: 46px;
            padding: 2px 4px;
          }
          .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
          .signature-cell {
            position: relative;
            min-height: 60px;
            border-top: 1px solid #111;
            padding: 6px 8px 18px;
            text-align: center;
            font-size: 11px;
          }
          .signature-cell + .signature-cell {
            border-left: 1px solid #111;
          }
          .signature-cell__image-wrap {
            display: flex;
            min-height: 34px;
            align-items: flex-end;
            justify-content: center;
          }
          .signature-cell__image {
            max-width: 150px;
            max-height: 34px;
            object-fit: contain;
          }
          .signature-cell__label {
            position: absolute;
            right: 0;
            bottom: 5px;
            left: 0;
            text-align: center;
          }
        </style>
      </head>
      <body>
        ${stubSections}
      </body>
    </html>`;
}

function buildPageHtml({
  visitBlocks,
  generatedDateLabel,
  cityLabel,
  directorSignatureDataUrl,
  fullName,
  documentNumber,
  institutionalLogoDataUrl,
  tenantLogoDataUrl,
  tenantName,
}: {
  visitBlocks: AlimentacionFormatoEntregaVisitBlock[];
  generatedDateLabel: string;
  cityLabel: string;
  directorSignatureDataUrl: string | null;
  fullName: string;
  documentNumber: string;
  institutionalLogoDataUrl: string | null;
  tenantLogoDataUrl: string;
  tenantName: string;
}): string {
  const stubs = visitBlocks
    .slice(0, STUBS_PER_PAGE)
    .map((visitBlock, stubIndex) =>
    buildStubHtml({
      visitBlock,
      generatedDateLabel,
      cityLabel,
      directorSignatureDataUrl,
      fullName,
      documentNumber,
      institutionalLogoDataUrl,
      tenantLogoDataUrl,
      tenantName,
      blockIndex: visitBlock.blockIndex,
      stubIndex,
    }),
    )
    .join("");

  return `<section class="page">${stubs}</section>`;
}

function buildStubHtml({
  visitBlock,
  generatedDateLabel,
  cityLabel,
  directorSignatureDataUrl,
  fullName,
  documentNumber,
  institutionalLogoDataUrl,
  tenantLogoDataUrl,
  tenantName,
  blockIndex,
  stubIndex,
}: {
  visitBlock: AlimentacionFormatoEntregaVisitBlock;
  generatedDateLabel: string;
  cityLabel: string;
  directorSignatureDataUrl: string | null;
  fullName: string;
  documentNumber: string;
  institutionalLogoDataUrl: string | null;
  tenantLogoDataUrl: string;
  tenantName: string;
  blockIndex: number;
  stubIndex: number;
}): string {
  const dayHeaders = visitBlock.slots
    .map((slot) => `<th class="day-label">Dia<br>${slot.columnLabel}</th>`)
    .join("");
  const rowRefrigerio1 = buildProductRow(
    "Refrigerio 1",
    visitBlock.slots,
    (slot) => slot.refrigerio1Mark,
  );
  const rowAlmuerzo = buildProductRow(
    "Almuerzo",
    visitBlock.slots,
    (slot) => slot.almuerzoMark,
  );
  const rowRefrigerio2 = buildProductRow(
    "Refrigerio 2",
    visitBlock.slots,
    (slot) => slot.refrigerio2Mark,
  );
  const rowAuxilio = buildProductRow(
    "Auxilio de transporte",
    visitBlock.slots,
    (slot) => slot.auxilioTransporteMark,
  );
  const institutionalLogoHtml =
    institutionalLogoDataUrl === null
      ? `<div class="stub-logo-fallback">Gobernacion del Magdalena</div>`
      : `<img src="${escapeHtml(institutionalLogoDataUrl)}" alt="Gobernacion del Magdalena" />`;
  const tenantLogoHtml = `<img src="${escapeHtml(tenantLogoDataUrl)}" alt="Logo de ${escapeHtml(tenantName)}" />`;
  const directorSignatureHtml =
    directorSignatureDataUrl === null
      ? ""
      : `<img
            class="signature-cell__image"
            src="${directorSignatureDataUrl}"
            alt="Firma del Director o quien entrega"
          />`;

  return `<section class="stub" data-block-index="${blockIndex}" data-stub-index="${stubIndex}">
    <header class="stub-header">
      <div class="stub-logo stub-logo--institutional">${institutionalLogoHtml}</div>
      <div class="stub-header-title">${escapeHtml(HEADER_TITLE)}</div>
      <div class="stub-logo stub-logo--tenant">${tenantLogoHtml}</div>
    </header>

    <table class="meta-table">
      <tr>
        <td>Ciudad:</td>
        <td>${escapeHtml(cityLabel)}</td>
      </tr>
      <tr>
        <td>Fecha:</td>
        <td>${escapeHtml(generatedDateLabel)}</td>
      </tr>
      <tr>
        <td>Lugar:</td>
        <td>${escapeHtml(FIXED_LUGAR_LABEL)}</td>
      </tr>
      <tr>
        <td>Beneficiado:</td>
        <td>${escapeHtml(fullName)} (${escapeHtml(documentNumber)})</td>
      </tr>
    </table>

    <table class="products-table">
      <thead>
        <tr>
          <th class="product-label">Productos Recibidos</th>
          ${dayHeaders}
        </tr>
      </thead>
      <tbody>
        ${rowRefrigerio1}
        ${rowAlmuerzo}
        ${rowRefrigerio2}
        ${rowAuxilio}
      </tbody>
    </table>

    <section class="activity">
      <div class="activity-title">${escapeHtml(ACTIVITY_DESCRIPTION_TITLE)}</div>
      <div class="activity-value">${escapeHtml(ACTIVITY_DESCRIPTION_VALUE)}</div>
    </section>

    <section class="signature-grid">
      <div class="signature-cell">
        <span class="signature-cell__label">Firma del Beneficiado</span>
      </div>
      <div class="signature-cell">
        <div class="signature-cell__image-wrap">
          ${directorSignatureHtml}
        </div>
        <span class="signature-cell__label">Firma del Director o quien entrega</span>
      </div>
    </section>
  </section>`;
}

function buildProductRow(
  label: string,
  visitSlots: AlimentacionFormatoEntregaVisitSlot[],
  resolveMark: (slot: AlimentacionFormatoEntregaVisitSlot) => string,
): string {
  const cells = visitSlots
    .map((slot) => `<td class="status-cell">${resolveMark(slot)}</td>`)
    .join("");

  return `<tr><td class="product-label">${escapeHtml(label)}</td>${cells}</tr>`;
}

function formatBogotaDate(value: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function formatTenantCityLabel(city: string | null, department: string | null): string {
  const normalizedCity = city?.trim();
  const normalizedDepartment = department?.trim();

  if (
    normalizedCity !== undefined &&
    normalizedCity !== "" &&
    normalizedDepartment !== undefined &&
    normalizedDepartment !== ""
  ) {
    return `${normalizedCity.toUpperCase()} - ${normalizedDepartment.toUpperCase()}`;
  }

  if (normalizedCity !== undefined && normalizedCity !== "") {
    return normalizedCity.toUpperCase();
  }

  if (normalizedDepartment !== undefined && normalizedDepartment !== "") {
    return normalizedDepartment.toUpperCase();
  }

  return "CIUDAD NO CONFIGURADA";
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
