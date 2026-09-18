import {
  type AuthUser,
  type ReportsDashboardQuery,
  type ReportsDashboardResponse,
} from "@cuidarte/contracts";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { chromium } from "playwright";

import playwrightEnv from "../../../common/playwright-env";
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
      await page.setContent(buildPdfHtml(dashboard), { waitUntil: "load" });
      const buffer = await page.pdf({
        format: "A4",
        landscape: true,
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

function buildPdfHtml(dashboard: ReportsDashboardResponse): string {
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
    @page { size: A4 landscape; margin: 14mm 12mm; }
    * { box-sizing: border-box; } body { margin: 0; color: #123b31; font: 11px Arial, sans-serif; }
    h1 { margin: 0 0 6px; font-size: 25px; } h2 { margin: 20px 0 9px; font-size: 16px; }
    .meta { color: #657a72; margin-bottom: 18px; } .metrics { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
    .metric { border: 1px solid #dce9e2; border-radius: 6px; padding: 10px; background: #f7fbf9; }
    .metric span { display: block; color: #657a72; font-size: 10px; margin-bottom: 7px; } .metric strong { font-size: 21px; }
    .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }
    .chart-panel { border: 1px solid #dce9e2; border-radius: 7px; padding: 10px 12px 8px; background: #fff; break-inside: avoid; }
    .chart-panel--wide { grid-column: 1 / -1; }
    .chart-panel h3 { margin: 0 0 3px; font-size: 13px; } .chart-panel p { margin: 0 0 5px; color: #657a72; font-size: 9px; }
    .chart-svg { display: block; width: 100%; height: auto; } .empty-chart { color: #657a72; padding: 28px 0; text-align: center; }
    .footer { margin-top: 12px; color: #657a72; font-size: 9px; }
  </style></head><body>
    <h1>Reporte ejecutivo de estadísticas</h1><div class="meta">${escapeHtml(scope)} · ${dashboard.range.from} a ${dashboard.range.to}</div>
    <div class="metrics">${cards}</div>
    <section class="charts">
      <article class="chart-panel"><h3>Atenciones por mes</h3><p>Comparación mensual de enfermería y medicina.</p>${buildAttendanceChart(monthlySeries)}</article>
      <article class="chart-panel"><h3>Actividades por tipo</h3><p>Sesiones grupales registradas en el periodo.</p>${buildActivityChart(dashboard)}</article>
      <article class="chart-panel chart-panel--wide"><h3>Entregas por mes</h3><p>Transporte, refrigerios y almuerzos entregados.</p>${buildDeliveryChart(monthlySeries)}</article>
    </section>
    <div class="footer">Generado por CuidarTe · Refrigerios totales = refrigerio 1 + refrigerio 2</div>
  </body></html>`;
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
  const x = (index: number) =>
    left + (points.length === 1 ? plotWidth / 2 : (index * plotWidth) / (points.length - 1));
  const y = (value: number) => top + plotHeight - (value / maxValue) * plotHeight;
  const line = (key: "nursingAttendances" | "medicalAttendances", color: string) =>
    `<polyline fill="none" stroke="${color}" stroke-width="3" points="${points.map((point, index) => `${x(index)},${y(point[key])}`).join(" ")}"/>`;
  const dots = (key: "nursingAttendances" | "medicalAttendances", color: string) =>
    points
      .map(
        (point, index) =>
          `<circle cx="${x(index)}" cy="${y(point[key])}" r="3.5" fill="${color}"/>`,
      )
      .join("");
  const grid = [0, 0.5, 1]
    .map((ratio) => {
      const value = Math.round(maxValue * ratio);
      const lineY = y(value);
      return `<line x1="${left}" y1="${lineY}" x2="${width - right}" y2="${lineY}" stroke="#e6eee9" stroke-dasharray="3 3"/><text x="${left - 8}" y="${lineY + 3}" text-anchor="end" fill="#657a72" font-size="10">${value}</text>`;
    })
    .join("");
  const labels = points
    .map(
      (point, index) =>
        `<text x="${x(index)}" y="${height - 13}" text-anchor="middle" fill="#657a72" font-size="9">${escapeHtml(formatChartMonth(point.month))}</text>`,
    )
    .join("");

  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Atenciones por mes"><g>${grid}</g>${line("nursingAttendances", "#168362")}${dots("nursingAttendances", "#168362")}${line("medicalAttendances", "#2b6b99")}${dots("medicalAttendances", "#2b6b99")}${labels}<g><circle cx="${left}" cy="${height - 2}" r="4" fill="#168362"/><text x="${left + 9}" y="${height + 1}" fill="#123b31" font-size="10">Enfermería</text><circle cx="${left + 110}" cy="${height - 2}" r="4" fill="#2b6b99"/><text x="${left + 119}" y="${height + 1}" fill="#123b31" font-size="10">Medicina</text></g></svg>`;
}

function buildActivityChart(dashboard: ReportsDashboardResponse): string {
  const activities = dashboard.activitiesByType;
  if (activities.length === 0) {
    return '<div class="empty-chart">Sin actividades en el periodo.</div>';
  }

  const width = 680;
  const rowHeight = 30;
  const height = Math.max(170, activities.length * rowHeight + 28);
  const left = 190;
  const right = 38;
  const top = 10;
  const plotWidth = width - left - right;
  const maxValue = Math.max(1, ...activities.map((activity) => activity.count));
  const rows = activities
    .map((activity, index) => {
      const y = top + index * rowHeight;
      const barWidth = (activity.count / maxValue) * plotWidth;
      return `<text x="${left - 8}" y="${y + 16}" text-anchor="end" fill="#657a72" font-size="10">${escapeHtml(activity.activityTypeName)}</text><rect x="${left}" y="${y + 5}" width="${plotWidth}" height="16" rx="3" fill="#e6eee9"/><rect x="${left}" y="${y + 5}" width="${barWidth}" height="16" rx="3" fill="#b47a25"/><text x="${Math.min(width - 4, left + barWidth + 8)}" y="${y + 17}" fill="#123b31" font-size="10">${activity.count}</text>`;
    })
    .join("");

  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Actividades por tipo">${rows}</svg>`;
}

function buildDeliveryChart(points: MonthlyChartPoint[]): string {
  if (points.length === 0) {
    return '<div class="empty-chart">Sin entregas en el periodo.</div>';
  }

  const width = 1380;
  const height = 260;
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

  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Entregas por mes"><g>${grid}</g>${bars}<g><circle cx="${left}" cy="${height - 2}" r="4" fill="#a24b48"/><text x="${left + 9}" y="${height + 1}" fill="#123b31" font-size="10">Transporte</text><circle cx="${left + 105}" cy="${height - 2}" r="4" fill="#70549a"/><text x="${left + 114}" y="${height + 1}" fill="#123b31" font-size="10">Refrigerios</text><circle cx="${left + 210}" cy="${height - 2}" r="4" fill="#4d7b38"/><text x="${left + 219}" y="${height + 1}" fill="#123b31" font-size="10">Almuerzos</text></g></svg>`;
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
