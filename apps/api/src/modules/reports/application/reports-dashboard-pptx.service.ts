import {
  type AuthUser,
  type ReportsDashboardQuery,
  type ReportsDashboardResponse,
} from "@cuidarte/contracts";
import { Injectable } from "@nestjs/common";
import PptxGenJS from "pptxgenjs";

import { ReportsDashboardService } from "./reports-dashboard.service";

export type ReportsDashboardPptxFile = {
  buffer: Buffer;
  contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  filename: string;
};

@Injectable()
export class ReportsDashboardPptxService {
  constructor(private readonly dashboardService: ReportsDashboardService) {}

  async exportPptx(
    query: ReportsDashboardQuery,
    actor: AuthUser,
  ): Promise<ReportsDashboardPptxFile> {
    const dashboard = await this.dashboardService.getDashboard(query, actor);
    const presentation = new PptxGenJS();
    presentation.layout = "LAYOUT_WIDE";
    presentation.author = "CuidarTe";
    presentation.subject = "Estadísticas de reportes";
    presentation.title = "Reporte ejecutivo de estadísticas";
    presentation.company = "CuidarTe";

    addCoverSlide(presentation, dashboard);
    addSummarySlide(presentation, dashboard);
    addDailySlide(presentation, dashboard);
    addActivitiesSlide(presentation, dashboard);
    addDeliverySlide(presentation, dashboard);
    addMethodologySlide(presentation, dashboard);

    const output = await presentation.write({ outputType: "nodebuffer" });
    return {
      buffer: Buffer.from(output as Uint8Array),
      contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      filename: `estadisticas-reportes-${query.from}-${query.to}.pptx`,
    };
  }
}

function addCoverSlide(presentation: PptxGenJS, dashboard: ReportsDashboardResponse): void {
  const slide = presentation.addSlide();
  slide.background = { color: "F3F8F5" };
  slide.addText("CuidarTe", {
    x: 0.8,
    y: 0.8,
    w: 3,
    h: 0.4,
    fontSize: 18,
    bold: true,
    color: "168362",
  });
  slide.addText("Reporte ejecutivo de estadísticas", {
    x: 0.8,
    y: 2,
    w: 11,
    h: 0.7,
    fontSize: 30,
    bold: true,
    color: "123B31",
  });
  slide.addText(
    `${dashboard.range.from} a ${dashboard.range.to}\n${dashboard.scope.isConsolidated ? "Todos los centros activos" : (dashboard.scope.tenantName ?? "Centro")}`,
    { x: 0.8, y: 2.9, w: 8, h: 0.8, fontSize: 17, color: "657A72" },
  );
}

function addSummarySlide(presentation: PptxGenJS, dashboard: ReportsDashboardResponse): void {
  const slide = baseSlide(presentation, "Resumen de indicadores");
  const rows = [
    ["Indicador", "Valor"],
    ["Enfermería", dashboard.summary.nursingAttendances],
    ["Medicina", dashboard.summary.medicalAttendances],
    ["Actividades", dashboard.summary.activities],
    ["Transporte", dashboard.summary.transportAllowancesDelivered],
    ["Refrigerios", dashboard.summary.snacksDelivered],
    ["Almuerzos", dashboard.summary.lunchesDelivered],
  ].map((row) => row.map((cell) => ({ text: String(cell) })));
  slide.addTable(rows, {
    x: 1,
    y: 1.35,
    w: 7.4,
    h: 4.6,
    border: { type: "solid", color: "DCE9E2", pt: 1 },
    fill: { color: "F7FBF9" },
    color: "123B31",
    fontSize: 16,
    bold: false,
    rowH: 0.55,
    margin: 0.12,
  });
}

function addDailySlide(presentation: PptxGenJS, dashboard: ReportsDashboardResponse): void {
  const slide = baseSlide(presentation, "Atenciones por día");
  const labels = dashboard.dailySeries.map((point) => point.date);
  slide.addChart(
    presentation.ChartType.line,
    [
      {
        name: "Enfermería",
        labels,
        values: dashboard.dailySeries.map((point) => point.nursingAttendances),
      },
      {
        name: "Medicina",
        labels,
        values: dashboard.dailySeries.map((point) => point.medicalAttendances),
      },
    ],
    chartOptions(),
  );
}

function addActivitiesSlide(presentation: PptxGenJS, dashboard: ReportsDashboardResponse): void {
  const slide = baseSlide(presentation, "Actividades por tipo");
  const labels = dashboard.activitiesByType.map((activity) => activity.activityTypeName);
  const values = dashboard.activitiesByType.map((activity) => activity.count);
  slide.addChart(presentation.ChartType.bar, [{ name: "Actividades", labels, values }], {
    ...chartOptions(),
    catAxisLabelRotate: 0,
    catAxisLabelPos: "low",
  });
}

function addDeliverySlide(presentation: PptxGenJS, dashboard: ReportsDashboardResponse): void {
  const slide = baseSlide(presentation, "Alimentación y transporte");
  const labels = dashboard.dailySeries.map((point) => point.date);
  slide.addChart(
    presentation.ChartType.bar,
    [
      {
        name: "Transporte",
        labels,
        values: dashboard.dailySeries.map((point) => point.transportAllowancesDelivered),
      },
      {
        name: "Refrigerios",
        labels,
        values: dashboard.dailySeries.map((point) => point.snacksDelivered),
      },
      {
        name: "Almuerzos",
        labels,
        values: dashboard.dailySeries.map((point) => point.lunchesDelivered),
      },
    ],
    { ...chartOptions(), catAxisLabelRotate: 45 },
  );
}

function addMethodologySlide(presentation: PptxGenJS, dashboard: ReportsDashboardResponse): void {
  const slide = baseSlide(presentation, "Metodología");
  slide.addText(
    [
      { text: "Rango inclusivo: ", options: { bold: true } },
      { text: `${dashboard.range.from} a ${dashboard.range.to}\n` },
      { text: "Atenciones médicas: ", options: { bold: true } },
      { text: "creadas por usuarios con rol médico.\n" },
      { text: "Actividades: ", options: { bold: true } },
      { text: "se excluyen registros eliminados.\n" },
      { text: "Alimentación: ", options: { bold: true } },
      { text: "se usa delivery_date y estado entregado." },
    ],
    {
      x: 1,
      y: 1.5,
      w: 10.5,
      h: 2.4,
      fontSize: 20,
      color: "123B31",
      breakLine: false,
      valign: "middle",
    },
  );
}

function baseSlide(presentation: PptxGenJS, title: string): PptxGenJS.Slide {
  const slide = presentation.addSlide();
  slide.background = { color: "FFFFFF" };
  slide.addText(title, {
    x: 0.65,
    y: 0.45,
    w: 11.5,
    h: 0.4,
    fontSize: 24,
    bold: true,
    color: "123B31",
  });
  return slide;
}

function chartOptions(): PptxGenJS.IChartOpts {
  return {
    x: 0.75,
    y: 1.1,
    w: 11.5,
    h: 5.65,
    showLegend: true,
    showTitle: false,
    showValue: false,
    showSerName: false,
    catAxisLabelFontFace: "Arial",
    catAxisLabelFontSize: 9,
    valAxisLabelFontFace: "Arial",
    valAxisLabelFontSize: 10,
    valAxisMinVal: 0,
    chartColors: ["168362", "2B6B99", "A24B48"],
  };
}
