import {
  type AuthUser,
  type ReportsDashboardQuery,
  type ReportsDashboardResponse,
} from "@cuidarte/contracts";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { chromium } from "playwright";

import playwrightEnv from "../../../common/playwright-env";
import { getPdfLetterheadDataUrl } from "../../../common/pdf-letterhead";
import { ReportsDashboardService } from "./reports-dashboard.service";

export type ReportsDashboardPdfFile = {
  buffer: Buffer;
  contentType: "application/pdf";
  filename: string;
};

@Injectable()
export class ReportsDashboardPdfService {
  constructor(private readonly dashboardService: ReportsDashboardService) {}

  async exportPdf(query: ReportsDashboardQuery, actor: AuthUser): Promise<ReportsDashboardPdfFile> {
    const dashboard = await this.dashboardService.getDashboard(query, actor);
    const browser = await chromium.launch({
      headless: true,
      env: playwrightEnv.createPlaywrightLaunchEnv(),
    });

    try {
      const page = await browser.newPage();
      await page.setContent(buildPdfHtml(dashboard, await getPdfLetterheadDataUrl()), {
        waitUntil: "load",
      });
      const buffer = await page.pdf({
        format: "Letter",
        landscape: false,
        printBackground: true,
        margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
      });

      return {
        buffer,
        contentType: "application/pdf",
        filename: `estadisticas-reportes-${query.from}-${query.to}.pdf`,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error
          ? `No fue posible generar el PDF: ${error.message}`
          : "No fue posible generar el PDF.",
      );
    } finally {
      await browser.close();
    }
  }
}

export function buildPdfHtml(
  dashboard: ReportsDashboardResponse,
  membreteDataUrl: string | null,
): string {
  const monthlySeries = buildMonthlySeries(dashboard.dailySeries);
  const scope = dashboard.scope.isConsolidated
    ? "Todos los centros activos"
    : (dashboard.scope.tenantName ?? "Centro");
  const cards = [
    ["Enfermería", dashboard.summary.nursingAttendances],
    ["Medicina", dashboard.summary.medicalAttendances],
    ["Actividades", dashboard.summary.activities],
    ["Transporte", dashboard.summary.transportAllowancesDelivered],
    ["Refrigerios", dashboard.summary.snacksDelivered],
    ["Almuerzos", dashboard.summary.lunchesDelivered],
  ]
    .map(
      ([label, value]) =>
        `<div class="metric"><span>${escapeHtml(String(label))}</span><strong>${value}</strong></div>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: Letter portrait; margin: 14mm 12mm; }
    * { box-sizing: border-box; } body { margin: 0; color: #123b31; font: 10.5px Arial, sans-serif; }
    .pdf-letterhead { position: fixed; top: -14mm; left: -12mm; z-index: 0; width: 215.9mm; height: 279.4mm; opacity: 0.3; pointer-events: none; }
    .pdf-letterhead img { display: block; width: 100%; height: 100%; object-fit: fill; transform: scale(0.94); transform-origin: center; }
    .report-content { position: relative; z-index: 1; }
    h1 { margin: 0 0 6px; font-size: 23px; } h2 { margin: 18px 0 8px; font-size: 15px; }
    .meta { color: #657a72; margin-bottom: 14px; } .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .metric { min-height: 62px; border: 1px solid #dce9e2; border-radius: 6px; padding: 9px; background: #f7fbf9; }
    .metric span { display: block; color: #657a72; font-size: 9px; margin-bottom: 6px; } .metric strong { font-size: 19px; }
    .charts { display: grid; grid-template-columns: 1fr; gap: 10px; margin-top: 14px; }
    .chart-panel { border: 1px solid #dce9e2; border-radius: 7px; padding: 10px 12px 8px; background: #fff; break-inside: avoid; }
    .chart-panel h3 { margin: 0 0 3px; font-size: 13px; } .chart-panel p { margin: 0 0 5px; color: #657a72; font-size: 9px; }
    .chart-svg { display: block; width: 100%; height: auto; } .empty-chart { color: #657a72; padding: 28px 0; text-align: center; }
  </style></head><body>
    ${renderLetterhead(membreteDataUrl)}
    <main class="report-content">
    <h1>Reporte ejecutivo de estadísticas</h1><div class="meta">${escapeHtml(scope)} · ${dashboard.range.from} a ${dashboard.range.to}</div>
    <div class="metrics">${cards}</div>
    <section class="charts">
      <article class="chart-panel"><h3>Personas por sexo</h3><p>Distribución de personas registradas.</p>${buildSexChart(dashboard)}</article>
      <article class="chart-panel"><h3>Atenciones por mes</h3><p>Comparación mensual de enfermería y medicina.</p>${buildAttendanceChart(monthlySeries)}</article>
      <article class="chart-panel"><h3>Actividades por tipo</h3><p>Sesiones grupales registradas en el periodo.</p>${buildActivityChart(dashboard)}</article>
      <article class="chart-panel"><h3>Entregas por mes</h3><p>Transporte, refrigerios y almuerzos entregados.</p>${buildDeliveryChart(monthlySeries)}</article>
      <article class="chart-panel"><h3>Almuerzos y refrigerios entregados por mes</h3>${buildMonthlyMetricChart(monthlySeries, "Raciones", "#70549a", (point) => point.snacksDelivered + point.lunchesDelivered)}</article>
      <article class="chart-panel"><h3>Auxilios de transporte por mes</h3>${buildMonthlyMetricChart(monthlySeries, "Auxilios", "#a24b48", (point) => point.transportAllowancesDelivered)}</article>
    </section>
    </main>
  </body></html>`;
}

function renderLetterhead(membreteDataUrl: string | null): string {
  if (membreteDataUrl === null) {
    return "";
  }

  return `<div class="pdf-letterhead" aria-hidden="true"><img src="${escapeHtml(membreteDataUrl)}" alt="" /></div>`;
}

type MonthlyChartPoint = {
  month: string;
  nursingAttendances: number;
  medicalAttendances: number;
  transportAllowancesDelivered: number;
  snacksDelivered: number;
  lunchesDelivered: number;
};

export function buildMonthlySeries(
  dailySeries: ReportsDashboardResponse["dailySeries"],
): MonthlyChartPoint[] {
  const pointsByMonth = new Map<string, MonthlyChartPoint>();

  for (const point of dailySeries) {
    const month = point.date.slice(0, 7);
    const existing = pointsByMonth.get(month);
    if (existing !== undefined) {
      existing.nursingAttendances += point.nursingAttendances;
      existing.medicalAttendances += point.medicalAttendances;
      existing.transportAllowancesDelivered += point.transportAllowancesDelivered;
      existing.snacksDelivered += point.snacksDelivered;
      existing.lunchesDelivered += point.lunchesDelivered;
      continue;
    }

    pointsByMonth.set(month, {
      month,
      nursingAttendances: point.nursingAttendances,
      medicalAttendances: point.medicalAttendances,
      transportAllowancesDelivered: point.transportAllowancesDelivered,
      snacksDelivered: point.snacksDelivered,
      lunchesDelivered: point.lunchesDelivered,
    });
  }

  return [...pointsByMonth.values()];
}

function buildAttendanceChart(points: MonthlyChartPoint[]): string {
  if (points.length === 0) {
    return '<div class="empty-chart">Sin datos en el periodo.</div>';
  }

  const width = 680;
  const height = 230;
  const left = 42;
  const right = 16;
  const top = 18;
  const bottom = 40;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(
    1,
    ...points.map((point) => Math.max(point.nursingAttendances, point.medicalAttendances)),
  );
  const y = (value: number) => top + plotHeight - (value / maxValue) * plotHeight;
  const grid = [0, 0.5, 1]
    .map((ratio) => {
      const value = Math.round(maxValue * ratio);
      const lineY = y(value);
      return `<line x1="${left}" y1="${lineY}" x2="${width - right}" y2="${lineY}" stroke="#e6eee9" stroke-dasharray="3 3"/><text x="${left - 8}" y="${lineY + 3}" text-anchor="end" fill="#657a72" font-size="10">${value}</text>`;
    })
    .join("");
  const groupWidth = plotWidth / points.length;
  const barWidth = Math.max(5, Math.min(24, groupWidth * 0.28));
  const bars = points
    .map((point, index) => {
      const center = left + index * groupWidth + groupWidth / 2;
      const nursingHeight = (point.nursingAttendances / maxValue) * plotHeight;
      const medicalHeight = (point.medicalAttendances / maxValue) * plotHeight;
      return `<rect x="${center - barWidth - 3}" y="${y(point.nursingAttendances)}" width="${barWidth}" height="${nursingHeight}" rx="3" fill="#168362"/><rect x="${center + 3}" y="${y(point.medicalAttendances)}" width="${barWidth}" height="${medicalHeight}" rx="3" fill="#2b6b99"/><text x="${center}" y="${height - 13}" text-anchor="middle" fill="#657a72" font-size="9">${escapeHtml(formatChartMonth(point.month))}</text>`;
    })
    .join("");

  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Atenciones por mes"><g>${grid}</g>${bars}<g><rect x="${left}" y="${height - 7}" width="8" height="8" rx="1" fill="#168362"/><text x="${left + 13}" y="${height + 1}" fill="#123b31" font-size="10">Enfermería</text><rect x="${left + 108}" y="${height - 7}" width="8" height="8" rx="1" fill="#2b6b99"/><text x="${left + 121}" y="${height + 1}" fill="#123b31" font-size="10">Medicina</text></g></svg>`;
}

function buildActivityChart(dashboard: ReportsDashboardResponse): string {
  const activities = dashboard.activitiesByType.filter((activity) => activity.count > 0);
  if (activities.length === 0) {
    return '<div class="empty-chart">Sin actividades en el periodo.</div>';
  }

  const width = 680;
  const height = 250;
  const left = 40;
  const right = 18;
  const top = 16;
  const bottom = 54;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(1, ...activities.map((activity) => activity.count));
  const y = (value: number) => top + plotHeight - (value / maxValue) * plotHeight;
  const grid = [0, 0.5, 1]
    .map((ratio) => {
      const value = Math.round(maxValue * ratio);
      const lineY = y(value);
      return `<line x1="${left}" y1="${lineY}" x2="${width - right}" y2="${lineY}" stroke="#e6eee9"/><text x="${left - 8}" y="${lineY + 3}" text-anchor="end" fill="#657a72" font-size="10">${value}</text>`;
    })
    .join("");
  const groupWidth = plotWidth / activities.length;
  const barWidth = Math.max(8, Math.min(46, groupWidth * 0.56));
  const bars = activities
    .map((activity, index) => {
      const center = left + index * groupWidth + groupWidth / 2;
      const barHeight = (activity.count / maxValue) * plotHeight;
      const label = wrapChartLabel(activity.activityTypeName, 13);
      const labelLines = label
        .map(
          (line, lineIndex) =>
            `<text x="${center}" y="${height - 31 + lineIndex * 10}" text-anchor="middle" fill="#657a72" font-size="9">${escapeHtml(line)}</text>`,
        )
        .join("");
      return `<rect x="${center - barWidth / 2}" y="${y(activity.count)}" width="${barWidth}" height="${barHeight}" rx="3" fill="#b47a25"/><text x="${center}" y="${Math.max(top + 10, y(activity.count) - 5)}" text-anchor="middle" fill="#845116" font-size="10" font-weight="700">${activity.count}</text>${labelLines}`;
    })
    .join("");

  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Actividades por tipo"><g>${grid}</g>${bars}</svg>`;
}

function buildDeliveryChart(points: MonthlyChartPoint[]): string {
  if (points.length === 0) {
    return '<div class="empty-chart">Sin entregas en el periodo.</div>';
  }

  const width = 680;
  const height = 230;
  const left = 44;
  const right = 18;
  const top = 18;
  const bottom = 45;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => [
      point.transportAllowancesDelivered,
      point.snacksDelivered,
      point.lunchesDelivered,
    ]),
  );
  const groupWidth = plotWidth / points.length;
  const barWidth = Math.max(2, Math.min(13, groupWidth * 0.18));
  const y = (value: number) => top + plotHeight - (value / maxValue) * plotHeight;
  const grid = [0, 0.5, 1]
    .map((ratio) => {
      const value = Math.round(maxValue * ratio);
      const lineY = y(value);
      return `<line x1="${left}" y1="${lineY}" x2="${width - right}" y2="${lineY}" stroke="#e6eee9" stroke-dasharray="3 3"/><text x="${left - 8}" y="${lineY + 3}" text-anchor="end" fill="#657a72" font-size="10">${value}</text>`;
    })
    .join("");
  const bars = points
    .map((point, index) => {
      const center = left + index * groupWidth + groupWidth / 2;
      const values = [
        point.transportAllowancesDelivered,
        point.snacksDelivered,
        point.lunchesDelivered,
      ];
      const colors = ["#a24b48", "#70549a", "#4d7b38"];
      const rects = values
        .map((value, barIndex) => {
          const barHeight = (value / maxValue) * plotHeight;
          return `<rect x="${center + (barIndex - 1) * (barWidth + 2) - barWidth / 2}" y="${top + plotHeight - barHeight}" width="${barWidth}" height="${barHeight}" rx="2" fill="${colors[barIndex]}"/>`;
        })
        .join("");
      return `${rects}<text x="${center}" y="${height - 17}" text-anchor="middle" fill="#657a72" font-size="9">${escapeHtml(formatChartMonth(point.month))}</text>`;
    })
    .join("");

  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Entregas mensuales por tipo de apoyo: transporte, refrigerios y almuerzos"><g>${grid}</g>${bars}<g><circle cx="${left}" cy="${height - 2}" r="4" fill="#a24b48"/><text x="${left + 9}" y="${height + 1}" fill="#123b31" font-size="10">Transporte</text><circle cx="${left + 105}" cy="${height - 2}" r="4" fill="#70549a"/><text x="${left + 114}" y="${height + 1}" fill="#123b31" font-size="10">Refrigerios</text><circle cx="${left + 210}" cy="${height - 2}" r="4" fill="#4d7b38"/><text x="${left + 219}" y="${height + 1}" fill="#123b31" font-size="10">Almuerzos</text></g></svg>`;
}

function buildSexChart(dashboard: ReportsDashboardResponse): string {
  const sexData = [
    { label: "Hombres", total: dashboard.sexDistribution.male, color: "#2b6b99" },
    { label: "Mujeres", total: dashboard.sexDistribution.female, color: "#168362" },
    { label: "Otro", total: dashboard.sexDistribution.other, color: "#70549a" },
  ].filter((item) => item.total > 0);
  const total = sexData.reduce((sum, item) => sum + item.total, 0);

  if (total === 0) {
    return '<div class="empty-chart">Sin personas registradas en el periodo.</div>';
  }

  const width = 680;
  const height = 190;
  const centerX = width / 2;
  const centerY = 82;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const slices = sexData
    .map((item) => {
      const length = (item.total / total) * circumference;
      const slice = `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="${item.color}" stroke-width="27" stroke-linecap="butt" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${centerX} ${centerY})"/>`;
      offset += length + 6;
      return slice;
    })
    .join("");
  const legendLabels = sexData.map(
    (item) => `${item.label} ${item.total} · ${Math.round((item.total / total) * 100)}%`,
  );
  const legendWidths = legendLabels.map((label) => 18 + label.length * 5.6);
  let legendX = centerX - legendWidths.reduce((sum, item) => sum + item, 0) / 2;
  const legend = sexData
    .map((item, index) => {
      const label = legendLabels[index]!;
      const itemWidth = legendWidths[index]!;
      const markup = `<rect x="${legendX}" y="${height - 27}" width="8" height="8" rx="1" fill="${item.color}"/><text x="${legendX + 13}" y="${height - 20}" fill="#123b31" font-size="10">${label}</text>`;
      legendX += itemWidth;
      return markup;
    })
    .join("");

  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Personas por sexo"><circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#edf2ef" stroke-width="27"/>${slices}<text x="${centerX}" y="${centerY - 2}" text-anchor="middle" fill="#123b31" font-size="20" font-weight="700">${total}</text><text x="${centerX}" y="${centerY + 14}" text-anchor="middle" fill="#657a72" font-size="9">Personas</text>${legend}</svg>`;
}

function buildMonthlyMetricChart(
  points: MonthlyChartPoint[],
  label: string,
  color: string,
  getValue: (point: MonthlyChartPoint) => number,
): string {
  if (points.length === 0) {
    return '<div class="empty-chart">Sin datos en el periodo.</div>';
  }

  const width = 680;
  const height = 220;
  const left = 44;
  const right = 18;
  const top = 16;
  const bottom = 40;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(1, ...points.map(getValue));
  const y = (value: number) => top + plotHeight - (value / maxValue) * plotHeight;
  const grid = [0, 0.5, 1]
    .map((ratio) => {
      const value = Math.round(maxValue * ratio);
      const lineY = y(value);
      return `<line x1="${left}" y1="${lineY}" x2="${width - right}" y2="${lineY}" stroke="#e6eee9"/><text x="${left - 8}" y="${lineY + 3}" text-anchor="end" fill="#657a72" font-size="10">${value}</text>`;
    })
    .join("");
  const groupWidth = plotWidth / points.length;
  const barWidth = Math.max(8, Math.min(36, groupWidth * 0.56));
  const bars = points
    .map((point, index) => {
      const value = getValue(point);
      const center = left + index * groupWidth + groupWidth / 2;
      const barHeight = (value / maxValue) * plotHeight;
      return `<rect x="${center - barWidth / 2}" y="${y(value)}" width="${barWidth}" height="${barHeight}" rx="3" fill="${color}"/><text x="${center}" y="${Math.max(top + 10, y(value) - 5)}" text-anchor="middle" fill="${color}" font-size="10" font-weight="700">${value > 0 ? value : ""}</text><text x="${center}" y="${height - 14}" text-anchor="middle" fill="#657a72" font-size="9">${escapeHtml(formatChartMonth(point.month))}</text>`;
    })
    .join("");

  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)} por mes"><g>${grid}</g>${bars}</svg>`;
}

function wrapChartLabel(value: string, maxLength: number): string[] {
  const words = value.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine === "" ? word : `${currentLine} ${word}`;
    if (candidate.length <= maxLength || currentLine === "") {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine !== "") {
    lines.push(currentLine);
  }

  return lines.slice(0, 2);
}

function formatChartMonth(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T00:00:00Z`));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
