import {
  type ActividadGrupalDiligenciamientoDetail,
  type ActividadGrupalResponsibleDepartment,
  type ActividadGrupalType,
  type UserRole,
} from "@cuidarte/contracts";

const EMPTY_FIELD_LABEL = "Pendiente de diligenciar.";
const EMPTY_ATTENDEES_LABEL = "Sin asistentes registrados.";
const EMPTY_PROFESSIONALS_LABEL = "Sin profesionales registrados.";

const TYPE_LABELS = {
  centro_vida: "Centro de Vida",
  actividad_campo: "Actividad de Campo",
  sesiones_psicosocial: "Sesiones Psicosocial",
  salud_preventiva: "Salud Preventiva",
  nutricion: "Nutricion",
  fisioterapia: "Fisioterapia",
  encuentro_intergeneracional: "Encuentro intergeneracional",
  actividades_manualidad: "Actividades de manualidad",
  actividades_recreacion: "Actividades de recreacion",
} satisfies Record<ActividadGrupalType, string>;

const RESPONSIBLE_DEPARTMENT_LABELS = {
  direccion: "Direccion",
  medicina: "Medicina",
  enfermeria: "Enfermeria",
  psicologia: "Psicologia",
  trabajo_social: "Trabajo Social",
  nutricion: "Nutricion",
  fisioterapia: "Fisioterapia",
  recreacion: "Recreacion",
} satisfies Record<ActividadGrupalResponsibleDepartment, string>;

const ROLE_LABELS = {
  super_admin: "SuperAdmin",
  admin: "Admin",
  auditor: "Auditor",
  director: "Director",
  enfermeria: "Enfermeria",
  fisioterapeuta: "Fisioterapeuta",
  medico: "Medico",
  nutricionista: "Nutricionista",
  psicologo: "Psicologo",
  recreacionista: "Recreacionista",
  trabajadora_social: "Trabajadora Social",
} satisfies Record<UserRole, string>;

type ActaTableRow = {
  cells: string[];
  key: string;
};

type BuildActividadGrupalActaPdfHtmlOptions = {
  detail: ActividadGrupalDiligenciamientoDetail;
  logoDataUrl: string | null;
};

export function buildActividadGrupalActaPdfHtml({
  detail,
  logoDataUrl,
}: BuildActividadGrupalActaPdfHtmlOptions): string {
  const actaDate = formatActaDate(detail.activityDate);
  const responsibleDepartment =
    detail.responsibleDepartment === null
      ? ""
      : RESPONSIBLE_DEPARTMENT_LABELS[detail.responsibleDepartment];
  const professionalRows = detail.assignedProfessionals.map((professional) => ({
    key: professional.id,
    cells: [
      professional.fullName,
      responsibleDepartment === "" ? ROLE_LABELS[professional.role] : responsibleDepartment,
      "",
    ],
  }));
  const attendeeRows = detail.integrantes.map((integrante) => ({
    key: integrante.id,
    cells: [integrante.fullName, integrante.documentNumber, ""],
  }));

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Acta No. ${detail.actaNumber}</title>
    <style>
      @page {
        size: 216mm 279mm;
        margin: 0;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #fff;
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .acta-document,
      .acta-document * {
        box-sizing: border-box;
      }

      .acta-document {
        width: 216mm;
        min-height: 279mm;
        padding: 12mm;
        color: #000;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 7.4pt;
        line-height: 1.24;
      }

      .acta-document table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      .acta-document th,
      .acta-document td {
        border: 1px solid #111;
        padding: 3px 5px;
        vertical-align: top;
      }

      .acta-document__header {
        margin-bottom: 3mm;
      }

      .acta-document__logo-cell {
        width: 42mm;
        height: 14mm;
        text-align: center;
        vertical-align: middle;
      }

      .acta-document__logo {
        max-width: 34mm;
        max-height: 10mm;
        object-fit: contain;
      }

      .acta-document__logo-fallback {
        display: inline-block;
        max-width: 32mm;
        color: #444;
        font-size: 6.4pt;
        font-weight: 700;
        line-height: 1.1;
      }

      .acta-document__title {
        height: 8mm;
        font-size: 9.6pt;
        font-weight: 700;
        text-align: center;
        vertical-align: middle;
      }

      .acta-document__quality {
        height: 6mm;
        font-size: 6.8pt;
        font-weight: 700;
        text-align: center;
        vertical-align: middle;
      }

      .acta-document__meta {
        margin-bottom: 3mm;
      }

      .acta-document__meta-label {
        width: 26mm;
      }

      .acta-document__meta-city {
        width: 48mm;
      }

      .acta-document__meta-time {
        width: 24mm;
      }

      .acta-document__meta th {
        background: #f4f4f4;
        font-size: 6.4pt;
        font-weight: 700;
        text-align: left;
      }

      .acta-document__meta td {
        height: 7mm;
        font-size: 6.9pt;
        font-weight: 600;
      }

      .acta-document__section {
        margin-bottom: 3mm;
      }

      .acta-document__section-title {
        margin: 0;
        padding: 3px 5px;
        border: 1px solid #111;
        background: #f4f4f4;
        color: #000;
        font-size: 7pt;
        font-weight: 700;
        line-height: 1.2;
      }

      .acta-document__section-body {
        min-height: 17mm;
        padding: 5px 7px;
        border: 1px solid #111;
        border-top: 0;
        color: #000;
        font-size: 6.9pt;
        line-height: 1.28;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .acta-document__section-body--objectives {
        min-height: 20mm;
      }

      .acta-document__section-body--development {
        min-height: 34mm;
      }

      .acta-document__section-body--conclusion {
        min-height: 16mm;
      }

      .acta-document__people-table th {
        background: #f4f4f4;
        font-size: 6.4pt;
        font-weight: 700;
        text-align: center;
        vertical-align: middle;
      }

      .acta-document__people-table td {
        height: 6.6mm;
        font-size: 6.8pt;
        font-weight: 600;
        vertical-align: middle;
      }

      .acta-document__people-table th:nth-child(2),
      .acta-document__people-table td:nth-child(2) {
        width: 30mm;
        text-align: center;
      }

      .acta-document__people-table th:nth-child(3),
      .acta-document__people-table td:nth-child(3) {
        width: 38mm;
      }
    </style>
  </head>
  <body>
    <article class="acta-document" aria-label="Acta de sesion grupal">
      <table class="acta-document__header" aria-label="Encabezado del acta">
        <tbody>
          <tr>
            <td class="acta-document__logo-cell" rowspan="2">
              ${renderLogo(logoDataUrl)}
            </td>
            <th class="acta-document__title" scope="col">
              ACTA No. ${escapeHtml(String(detail.actaNumber))} - ${escapeHtml(actaDate)}
            </th>
          </tr>
          <tr>
            <td class="acta-document__quality">SISTEMA DE GESTION DE CALIDAD</td>
          </tr>
        </tbody>
      </table>

      <table class="acta-document__meta" aria-label="Datos generales del acta">
        <colgroup>
          <col class="acta-document__meta-label" />
          <col class="acta-document__meta-city" />
          <col class="acta-document__meta-label" />
          <col class="acta-document__meta-time" />
          <col class="acta-document__meta-label" />
          <col class="acta-document__meta-time" />
        </colgroup>
        <tbody>
          <tr>
            <th scope="row">CIUDAD Y FECHA:</th>
            <td>${escapeHtml(formatUpper(`${detail.tenantName} - ${actaDate}`))}</td>
            <th scope="row">HORA INICIO:</th>
            <td>${escapeHtml(formatActaTime(detail.startTime))}</td>
            <th scope="row">HORA FIN:</th>
            <td>${escapeHtml(formatActaTime(detail.endTime))}</td>
          </tr>
          <tr>
            <th scope="row">TIPO ACTIVIDAD:</th>
            <td colspan="5">${escapeHtml(
              formatUpper(TYPE_LABELS[detail.activityType]),
            )}</td>
          </tr>
          <tr>
            <th scope="row">ACTIVIDAD:</th>
            <td colspan="5">${escapeHtml(formatUpper(detail.activityName))}</td>
          </tr>
        </tbody>
      </table>

      ${renderTextSection("OBJETIVOS:", detail.objectives, "objectives")}
      ${renderTextSection("DESARROLLO DE LA REUNION:", detail.development, "development")}
      ${renderTextSection("CONCLUSION:", detail.conclusion, "conclusion")}

      ${renderPeopleSection(
        "PROFESIONALES RESPONSABLES",
        ["NOMBRE PROFESIONAL", "AREA", "FIRMA"],
        professionalRows,
        EMPTY_PROFESSIONALS_LABEL,
      )}

      ${renderPeopleSection(
        "LISTADO DE ASISTENTES",
        ["NOMBRE COMPLETO", "CEDULA", "FIRMA"],
        attendeeRows,
        EMPTY_ATTENDEES_LABEL,
      )}
    </article>
  </body>
</html>`;
}

export function buildActividadGrupalActaPdfFilename(
  detail: ActividadGrupalDiligenciamientoDetail,
): string {
  return `acta-sesion-grupal-${formatActaNumber(detail.actaNumber)}.pdf`;
}

function renderLogo(logoDataUrl: string | null): string {
  if (logoDataUrl === null) {
    return '<span class="acta-document__logo-fallback">Gobernacion del Magdalena</span>';
  }

  return `<img class="acta-document__logo" src="${escapeHtml(logoDataUrl)}" alt="Gobernacion del Magdalena" />`;
}

function renderTextSection(
  title: string,
  value: string,
  variant: "conclusion" | "development" | "objectives",
): string {
  return `<section class="acta-document__section">
    <h2 class="acta-document__section-title">${escapeHtml(title)}</h2>
    <div class="acta-document__section-body acta-document__section-body--${variant}">${escapeHtml(
      formatTextBlock(value),
    )}</div>
  </section>`;
}

function renderPeopleSection(
  title: string,
  headers: [string, string, string],
  rows: ActaTableRow[],
  emptyLabel: string,
): string {
  const bodyRows =
    rows.length === 0
      ? `<tr><td colspan="${headers.length}">${escapeHtml(emptyLabel)}</td></tr>`
      : rows
          .map(
            (row) => `<tr>${row.cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
          )
          .join("");

  return `<section class="acta-document__section">
    <h2 class="acta-document__section-title">${escapeHtml(title)}</h2>
    <table class="acta-document__people-table">
      <thead>
        <tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </section>`;
}

function formatActaDate(date: string): string {
  const [year, month, day] = date.split("-");

  if (year === undefined || month === undefined || day === undefined) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

function formatActaNumber(value: number): string {
  return String(value).padStart(4, "0");
}

function formatActaTime(time: string): string {
  return /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
}

function formatTextBlock(value: string): string {
  const trimmedValue = value.trim();

  return trimmedValue === "" ? EMPTY_FIELD_LABEL : trimmedValue;
}

function formatUpper(value: string): string {
  return value.toLocaleUpperCase("es-CO");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
