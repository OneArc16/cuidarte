import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  type AuthUser,
  type ReportsDashboardQuery,
  type ReportsDashboardResponse,
} from "@cuidarte/contracts";
import { Injectable, Optional } from "@nestjs/common";
import PptxGenJS from "pptxgenjs";

import { TenantBrandingService } from "../../tenant-branding/application/tenant-branding.service";
import { ReportsDashboardService } from "./reports-dashboard.service";

export type ReportsDashboardPptxFile = {
  buffer: Buffer;
  contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  filename: string;
};

type PptxBrandingAssets = {
  organizationLogoData: string | null;
  governmentLogoData: string | null;
};

const INSTITUTIONAL_LOGO_RELATIVE_PATH = path.join("public", "logos", "gobernacion-magdalena.png");

@Injectable()
export class ReportsDashboardPptxService {
  constructor(
    private readonly dashboardService: ReportsDashboardService,
    @Optional() private readonly tenantBrandingService?: TenantBrandingService,
  ) {}

  async exportPptx(
    query: ReportsDashboardQuery,
    actor: AuthUser,
  ): Promise<ReportsDashboardPptxFile> {
    const dashboard = await this.dashboardService.getDashboard(query, actor);
    const branding = await resolvePptxBranding(dashboard, this.tenantBrandingService);
    const presentation = new PptxGenJS();
    presentation.layout = "LAYOUT_WIDE";
    presentation.author = "CuidarTe";
    presentation.subject = "Estadísticas de reportes";
    presentation.title = "Reporte ejecutivo de estadísticas";
    presentation.company = "CuidarTe";

    const monthlySeries = buildMonthlySeries(dashboard.dailySeries);
    addCoverSlide(presentation, dashboard, branding);
    addSummarySlide(presentation, dashboard);
    addMonthlyAttendanceSlide(presentation, monthlySeries);
    addActivitiesSlide(presentation, dashboard);
    addDeliverySlide(presentation, monthlySeries);

    const output = await presentation.write({ outputType: "nodebuffer" });
    return {
      buffer: Buffer.from(output as Uint8Array),
      contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      filename: `estadisticas-reportes-${query.from}-${query.to}.pptx`,
    };
  }
}

function addCoverSlide(
  presentation: PptxGenJS,
  dashboard: ReportsDashboardResponse,
  branding: PptxBrandingAssets,
): void {
  const slide = presentation.addSlide();
  slide.background = { color: "F3F8F5" };
  addLogoCard(
    presentation,
    slide,
    branding.organizationLogoData,
    "Logo de la organización",
    "CuidarTe",
    { x: 0.65, y: 0.35, w: 2.75, h: 1.1 },
  );
  addLogoCard(
    presentation,
    slide,
    branding.governmentLogoData,
    "Logo de la Gobernación del Magdalena",
    "Gobernación del Magdalena",
    { x: 9.93, y: 0.35, w: 2.75, h: 1.1 },
  );
  slide.addShape(presentation.ShapeType.line, {
    x: 0.65,
    y: 1.7,
    w: 12.03,
    h: 0,
    line: { color: "DCE9E2", pt: 1.2 },
  });
  slide.addText("Reporte ejecutivo de estadísticas", {
    x: 1.05,
    y: 2.15,
    w: 11.23,
    h: 0.7,
    fontSize: 30,
    bold: true,
    color: "123B31",
    align: "center",
  });
  slide.addText(
    [
      {
        text: `Periodo: ${dashboard.range.from} a ${dashboard.range.to}\n`,
        options: { bold: true },
      },
      {
        text: `${dashboard.scope.isConsolidated ? "Todos los centros activos" : (dashboard.scope.tenantName ?? "Centro")}\n`,
      },
      {
        text: `Sede: ${dashboard.scope.municipality ?? "Municipio no registrado"}, ${dashboard.scope.department ?? "Departamento no registrado"}`,
      },
    ],
    {
      x: 1.5,
      y: 3.15,
      w: 10.33,
      h: 1.2,
      fontSize: 17,
      color: "657A72",
      align: "center",
      breakLine: false,
      valign: "middle",
    },
  );
}

function addLogoCard(
  presentation: PptxGenJS,
  slide: PptxGenJS.Slide,
  data: string | null,
  altText: string,
  fallbackLabel: string,
  position: { x: number; y: number; w: number; h: number },
): void {
  slide.addShape(presentation.ShapeType.roundRect, {
    ...position,
    rectRadius: 0.08,
    fill: { color: "FFFFFF" },
    line: { color: "DCE9E2", pt: 1 },
  });
  if (data !== null) {
    const imageWidth = position.w - 0.36;
    const imageHeight = position.h - 0.24;
    slide.addImage({
      data,
      altText,
      x: position.x + 0.18,
      y: position.y + 0.12,
      w: imageWidth,
      h: imageHeight,
      sizing: { type: "contain", w: imageWidth, h: imageHeight },
    });
    return;
  }

  slide.addText(fallbackLabel, {
    x: position.x + 0.18,
    y: position.y + 0.27,
    w: position.w - 0.36,
    h: position.h - 0.54,
    fontSize: 13,
    bold: true,
    color: "168362",
    align: "center",
    valign: "middle",
    fit: "shrink",
  });
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
    x: 2.15,
    y: 1.35,
    w: 9.03,
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

function addMonthlyAttendanceSlide(
  presentation: PptxGenJS,
  monthlySeries: MonthlyChartPoint[],
): void {
  const slide = baseSlide(presentation, "Atenciones por mes");
  const labels = monthlySeries.map((point) => formatChartMonth(point.month));
  slide.addChart(
    presentation.ChartType.line,
    [
      {
        name: "Enfermería",
        labels,
        values: monthlySeries.map((point) => point.nursingAttendances),
      },
      {
        name: "Medicina",
        labels,
        values: monthlySeries.map((point) => point.medicalAttendances),
      },
    ],
    chartOptions(),
  );
}

function addActivitiesSlide(presentation: PptxGenJS, dashboard: ReportsDashboardResponse): void {
  const slide = baseSlide(presentation, "Actividades por tipo");
  const labels =
    dashboard.activitiesByType.length > 0
      ? dashboard.activitiesByType.map((activity) => activity.activityTypeName)
      : ["Sin actividades"];
  const values =
    dashboard.activitiesByType.length > 0
      ? dashboard.activitiesByType.map((activity) => activity.count)
      : [0];
  slide.addChart(presentation.ChartType.bar, [{ name: "Actividades", labels, values }], {
    ...chartOptions(),
    catAxisLabelRotate: 0,
    catAxisLabelPos: "low",
  });
}

function addDeliverySlide(presentation: PptxGenJS, monthlySeries: MonthlyChartPoint[]): void {
  const slide = baseSlide(presentation, "Alimentación y transporte");
  const labels = monthlySeries.map((point) => formatChartMonth(point.month));
  slide.addChart(
    presentation.ChartType.bar,
    [
      {
        name: "Transporte",
        labels,
        values: monthlySeries.map((point) => point.transportAllowancesDelivered),
      },
      {
        name: "Refrigerios",
        labels,
        values: monthlySeries.map((point) => point.snacksDelivered),
      },
      {
        name: "Almuerzos",
        labels,
        values: monthlySeries.map((point) => point.lunchesDelivered),
      },
    ],
    { ...chartOptions(), catAxisLabelRotate: 0 },
  );
}

function baseSlide(presentation: PptxGenJS, title: string): PptxGenJS.Slide {
  const slide = presentation.addSlide();
  slide.background = { color: "FFFFFF" };
  slide.addText(title, {
    x: 0.8,
    y: 0.45,
    w: 11.73,
    h: 0.4,
    fontSize: 24,
    bold: true,
    color: "123B31",
    align: "center",
  });
  return slide;
}

function chartOptions(): PptxGenJS.IChartOpts {
  return {
    x: 1,
    y: 1.25,
    w: 11.33,
    h: 5.45,
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

function formatChartMonth(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T00:00:00Z`));
}

async function resolvePptxBranding(
  dashboard: ReportsDashboardResponse,
  tenantBrandingService?: TenantBrandingService,
): Promise<PptxBrandingAssets> {
  const [governmentLogoBuffer, organizationLogoBuffer] = await Promise.all([
    readInstitutionalLogo(),
    readOrganizationLogo(dashboard.scope.tenantId, tenantBrandingService),
  ]);

  return {
    governmentLogoData: toPptxImageData(governmentLogoBuffer),
    organizationLogoData: toPptxImageData(organizationLogoBuffer),
  };
}

async function readOrganizationLogo(
  tenantId: string | null,
  tenantBrandingService?: TenantBrandingService,
): Promise<Buffer | null> {
  if (tenantId === null || tenantBrandingService === undefined) {
    return null;
  }

  try {
    const version = await tenantBrandingService.resolveActiveLogo(tenantId);
    const file = await tenantBrandingService.readLogoVersionFile(version);
    return file.buffer;
  } catch {
    return null;
  }
}

async function readInstitutionalLogo(): Promise<Buffer | null> {
  const candidatePaths = [
    path.resolve(process.cwd(), "apps", "web", INSTITUTIONAL_LOGO_RELATIVE_PATH),
    path.resolve(process.cwd(), "..", "web", INSTITUTIONAL_LOGO_RELATIVE_PATH),
  ];

  for (const candidatePath of candidatePaths) {
    try {
      return await readFile(candidatePath);
    } catch {
      continue;
    }
  }

  return null;
}

function toPptxImageData(buffer: Buffer | null): string | null {
  return buffer === null ? null : `image/png;base64,${buffer.toString("base64")}`;
}
