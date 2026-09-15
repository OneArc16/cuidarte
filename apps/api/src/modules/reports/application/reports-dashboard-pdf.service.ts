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
  const dailyRows = dashboard.dailySeries
    .map(
      (point) =>
        `<tr><td>${point.date}</td><td>${point.nursingAttendances}</td><td>${point.medicalAttendances}</td><td>${point.activities}</td><td>${point.transportAllowancesDelivered}</td><td>${point.snacksDelivered}</td><td>${point.lunchesDelivered}</td></tr>`,
    )
    .join("");
  const activityRows = dashboard.activitiesByType
    .map(
      (activity) =>
        `<tr><td>${escapeHtml(activity.activityTypeName)}</td><td>${activity.count}</td></tr>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: A4 landscape; margin: 14mm 12mm; }
    * { box-sizing: border-box; } body { margin: 0; color: #123b31; font: 11px Arial, sans-serif; }
    h1 { margin: 0 0 6px; font-size: 25px; } h2 { margin: 20px 0 9px; font-size: 16px; }
    .meta { color: #657a72; margin-bottom: 18px; } .metrics { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
    .metric { border: 1px solid #dce9e2; border-radius: 6px; padding: 10px; background: #f7fbf9; }
    .metric span { display: block; color: #657a72; font-size: 10px; margin-bottom: 7px; } .metric strong { font-size: 21px; }
    table { width: 100%; border-collapse: collapse; } th { color: white; background: #085041; text-align: left; } th, td { border: 1px solid #dce9e2; padding: 5px 7px; }
    tr:nth-child(even) { background: #f7fbf9; } .columns { display: grid; grid-template-columns: 1.7fr 1fr; gap: 18px; }
    .bar { display: flex; align-items: center; gap: 8px; margin: 5px 0; } .bar-label { width: 155px; } .bar-track { flex: 1; height: 10px; background: #e4eee9; } .bar-fill { height: 100%; background: #168362; }
    .footer { margin-top: 22px; color: #657a72; font-size: 9px; }
  </style></head><body>
    <h1>Reporte ejecutivo de estadísticas</h1><div class="meta">${escapeHtml(scope)} · ${dashboard.range.from} a ${dashboard.range.to}</div>
    <div class="metrics">${cards}</div>
    <div class="columns"><div><h2>Atenciones, actividades y entregas por día</h2><table><thead><tr><th>Fecha</th><th>Enfermería</th><th>Medicina</th><th>Actividades</th><th>Transporte</th><th>Refrigerios</th><th>Almuerzos</th></tr></thead><tbody>${dailyRows}</tbody></table></div>
    <div><h2>Actividades por tipo</h2>${dashboard.activitiesByType.map((activity) => `<div class="bar"><span class="bar-label">${escapeHtml(activity.activityTypeName)}</span><span class="bar-track"><span class="bar-fill" style="width:${barWidth(activity.count, dashboard.summary.activities)}%"></span></span><strong>${activity.count}</strong></div>`).join("") || "<p>Sin actividades en el periodo.</p>"}</div></div>
    <h2>Metodología</h2><p>Las fechas son inclusivas. Los días sin registros se incluyen con valor cero. Las atenciones médicas consideran únicamente registros creados por usuarios con rol médico; las actividades eliminadas se excluyen.</p>
    <div class="footer">Generado por CuidarTe · Refrigerios totales = refrigerio 1 + refrigerio 2 · Actividades por tipo: ${activityRows ? "incluidas" : "sin registros"}</div>
  </body></html>`;
}

function barWidth(value: number, total: number): number {
  return total === 0 ? 0 : Math.max(4, Math.round((value / total) * 100));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
