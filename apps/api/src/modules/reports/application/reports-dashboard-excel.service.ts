import {
  type AuthUser,
  type ReportsDashboardQuery,
  type ReportsDashboardResponse,
} from "@cuidarte/contracts";
import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";

import { ReportsDashboardService } from "./reports-dashboard.service";

export type ReportsDashboardExcelFile = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

const EXCEL_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

@Injectable()
export class ReportsDashboardExcelService {
  constructor(private readonly dashboardService: ReportsDashboardService) {}

  async exportExcel(
    query: ReportsDashboardQuery,
    actor: AuthUser,
  ): Promise<ReportsDashboardExcelFile> {
    const dashboard = await this.dashboardService.getDashboard(query, actor);
    const workbook = new ExcelJS.Workbook();

    workbook.creator = "CuidarTe";
    workbook.created = new Date();
    workbook.company = "CuidarTe";

    this.buildSummarySheet(workbook, dashboard);
    this.buildDailySheet(workbook, dashboard);
    this.buildActivitiesSheet(workbook, dashboard);
    this.buildMethodologySheet(workbook);

    return {
      buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
      contentType: EXCEL_CONTENT_TYPE,
      filename: `estadisticas-reportes-${dashboard.range.from}-${dashboard.range.to}.xlsx`,
    };
  }

  private buildSummarySheet(workbook: ExcelJS.Workbook, dashboard: ReportsDashboardResponse): void {
    const sheet = workbook.addWorksheet("Resumen");
    const scope = dashboard.scope.isConsolidated
      ? "Todos los centros activos"
      : (dashboard.scope.tenantName ?? "Centro");

    sheet.columns = [
      { header: "Indicador", key: "indicator", width: 34 },
      { header: "Valor", key: "value", width: 18 },
    ];
    sheet.addRows([
      ["Rango inicial", dashboard.range.from],
      ["Rango final", dashboard.range.to],
      ["Alcance", scope],
      [],
      ["Atenciones por enfermería", dashboard.summary.nursingAttendances],
      ["Atenciones por médico", dashboard.summary.medicalAttendances],
      ["Actividades realizadas", dashboard.summary.activities],
      ["Auxilios de transporte", dashboard.summary.transportAllowancesDelivered],
      ["Refrigerio 1", dashboard.summary.snackOneDelivered],
      ["Refrigerio 2", dashboard.summary.snackTwoDelivered],
      ["Refrigerios totales", dashboard.summary.snacksDelivered],
      ["Almuerzos", dashboard.summary.lunchesDelivered],
    ]);
    styleWorksheet(sheet);
  }

  private buildDailySheet(workbook: ExcelJS.Workbook, dashboard: ReportsDashboardResponse): void {
    const sheet = workbook.addWorksheet("Por dia");
    sheet.columns = [
      { header: "Fecha", key: "date", width: 15 },
      { header: "Enfermería", key: "nursing", width: 16 },
      { header: "Medicina", key: "medical", width: 14 },
      { header: "Actividades", key: "activities", width: 15 },
      { header: "Transporte", key: "transport", width: 15 },
      { header: "Refrigerios", key: "snacks", width: 15 },
      { header: "Almuerzos", key: "lunches", width: 15 },
    ];
    sheet.addRows(
      dashboard.dailySeries.map((point) => [
        point.date,
        point.nursingAttendances,
        point.medicalAttendances,
        point.activities,
        point.transportAllowancesDelivered,
        point.snacksDelivered,
        point.lunchesDelivered,
      ]),
    );
    styleWorksheet(sheet);
  }

  private buildActivitiesSheet(
    workbook: ExcelJS.Workbook,
    dashboard: ReportsDashboardResponse,
  ): void {
    const sheet = workbook.addWorksheet("Actividades por tipo");
    sheet.columns = [
      { header: "Tipo de actividad", key: "type", width: 42 },
      { header: "Cantidad", key: "count", width: 16 },
    ];
    sheet.addRows(
      dashboard.activitiesByType.map((activity) => [activity.activityTypeName, activity.count]),
    );
    styleWorksheet(sheet);
  }

  private buildMethodologySheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet("Metodologia");
    sheet.columns = [
      { header: "Indicador", key: "indicator", width: 34 },
      { header: "Definición", key: "definition", width: 100 },
    ];
    sheet.addRows([
      [
        "Atenciones por enfermería",
        "Registros de atenciones de enfermería no eliminados, agrupados por fecha de atención.",
      ],
      [
        "Atenciones por médico",
        "Atenciones individuales cuyo usuario creador tiene rol médico, agrupadas por fecha de atención.",
      ],
      [
        "Actividades realizadas",
        "Actividades grupales no eliminadas, agrupadas por fecha y tipo de actividad.",
      ],
      [
        "Auxilios de transporte",
        "Registros de alimentación con auxilio de transporte marcado como entregado, usando delivery_date.",
      ],
      [
        "Refrigerios",
        "Suma de refrigerio 1 y refrigerio 2 marcados como entregados, usando delivery_date.",
      ],
      [
        "Almuerzos",
        "Registros de alimentación con almuerzo marcado como entregado, usando delivery_date.",
      ],
      [
        "Rango",
        "Todas las fechas son inclusivas. Los días sin registros se incluyen con valor cero.",
      ],
    ]);
    styleWorksheet(sheet);
  }
}

function styleWorksheet(sheet: ExcelJS.Worksheet): void {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF085041" } };
  header.alignment = { vertical: "middle", wrapText: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of sheet.getRows(2, sheet.rowCount - 1) ?? []) {
    row.alignment = { vertical: "top", wrapText: true };
  }
}
