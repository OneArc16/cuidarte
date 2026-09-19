import {
  type AuthUser,
  type ReportsDashboardQuery,
  type ReportsDashboardResponse,
} from "@cuidarte/contracts";
import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import JSZip from "jszip";

import { ReportsDashboardService } from "./reports-dashboard.service";

export type ReportsDashboardExcelFile = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

const EXCEL_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type NativeChartSpec = {
  sheetId: number;
  sheetName: string;
  title: string;
  seriesName: string;
  categoryRange: string;
  valueRange: string;
  categories: string[];
  values: number[];
  color: string;
  chartType: "bar" | "pie";
  colors?: string[];
  anchor: {
    fromCol: number;
    fromRow: number;
    toCol: number;
    toRow: number;
  };
};

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

    const chartSpecs = [
      ...this.buildSummarySheet(workbook, dashboard),
      ...this.buildMonthlySheets(workbook, dashboard),
      this.buildActivitiesSheet(workbook, dashboard),
    ];
    const workbookBuffer = Buffer.from(await workbook.xlsx.writeBuffer());

    return {
      buffer: await addNativeCharts(workbookBuffer, chartSpecs),
      contentType: EXCEL_CONTENT_TYPE,
      filename: `estadisticas-reportes-${dashboard.range.from}-${dashboard.range.to}.xlsx`,
    };
  }

  private buildSummarySheet(
    workbook: ExcelJS.Workbook,
    dashboard: ReportsDashboardResponse,
  ): NativeChartSpec[] {
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
    for (let column = 4; column <= 19; column += 1) {
      sheet.getColumn(column).width = 11;
    }
    styleWorksheet(sheet);
    const categories = [
      "Atenciones por enfermería",
      "Atenciones por médico",
      "Actividades realizadas",
      "Auxilios de transporte",
    ];
    const values = [
      dashboard.summary.nursingAttendances,
      dashboard.summary.medicalAttendances,
      dashboard.summary.activities,
      dashboard.summary.transportAllowancesDelivered,
    ];

    return [
      chartSpec({
        sheet,
        title: "Indicadores principales del periodo",
        seriesName: "Cantidad",
        categoryRange: "$A$6:$A$9",
        valueRange: "$B$6:$B$9",
        categories,
        values,
        color: "168362",
        chartType: "bar",
        anchor: { fromCol: 3, fromRow: 1, toCol: 11, toRow: 17 },
      }),
      chartSpec({
        sheet,
        title: "Distribución de indicadores principales",
        seriesName: "Cantidad",
        categoryRange: "$A$6:$A$9",
        valueRange: "$B$6:$B$9",
        categories,
        values,
        color: "168362",
        chartType: "pie",
        colors: ["168362", "2B6B99", "B47A25", "A24B48"],
        anchor: { fromCol: 12, fromRow: 1, toCol: 19, toRow: 17 },
      }),
    ];
  }

  private buildMonthlySheets(
    workbook: ExcelJS.Workbook,
    dashboard: ReportsDashboardResponse,
  ): NativeChartSpec[] {
    const monthlySeries = buildMonthlySeries(dashboard.dailySeries);
    const scope = dashboard.scope.isConsolidated
      ? "Todos los centros activos"
      : (dashboard.scope.tenantName ?? "Centro");

    return monthlySeries.flatMap((point) => this.buildMonthlySheet(workbook, point, scope));
  }

  private buildMonthlySheet(
    workbook: ExcelJS.Workbook,
    point: MonthlyReportPoint,
    scope: string,
  ): NativeChartSpec[] {
    const sheet = workbook.addWorksheet(formatMonthSheetName(point.month));
    sheet.columns = [
      { width: 34 },
      { width: 16 },
      { width: 3 },
      ...Array.from({ length: 16 }, () => ({ width: 11 })),
    ];
    sheet.getRow(1).height = 28;
    sheet.getRow(2).height = 20;
    sheet.mergeCells("A1:S1");
    sheet.mergeCells("A2:S2");
    sheet.getCell("A1").value = `Reporte mensual: ${formatMonthTitle(point.month)}`;
    sheet.getCell("A2").value = `${scope} · valores acumulados del mes`;
    styleTitle(sheet.getCell("A1"), 16);
    styleSubtitle(sheet.getCell("A2"));

    sheet.getCell("A4").value = "Indicador";
    sheet.getCell("B4").value = "Cantidad";
    styleHeaderRow(sheet.getRow(4));
    sheet.addRows([
      ["Atenciones de enfermería", point.nursingAttendances],
      ["Atenciones de medicina", point.medicalAttendances],
      ["Actividades realizadas", point.activities],
      ["Auxilios de transporte", point.transportAllowancesDelivered],
      ["Refrigerios entregados", point.snacksDelivered],
      ["Almuerzos entregados", point.lunchesDelivered],
    ]);
    for (const row of sheet.getRows(5, 6) ?? []) {
      row.alignment = { vertical: "top", wrapText: true };
    }
    sheet.getColumn(2).numFmt = "#,##0";

    sheet.mergeCells("A13:B14");
    sheet.getCell("A13").value =
      "Nota: Refrigerios corresponde a la suma de refrigerio 1 y refrigerio 2 entregados.";
    sheet.getCell("A13").font = { italic: true, color: { argb: "FF657A72" } };
    sheet.getCell("A13").alignment = { wrapText: true };
    sheet.views = [{ state: "frozen", ySplit: 4 }];

    return [
      chartSpec({
        sheet,
        title: "Atenciones y actividades",
        seriesName: "Cantidad",
        categoryRange: "$A$5:$A$7",
        valueRange: "$B$5:$B$7",
        categories: ["Enfermería", "Medicina", "Actividades"],
        values: [point.nursingAttendances, point.medicalAttendances, point.activities],
        color: "168362",
        chartType: "bar",
        anchor: { fromCol: 3, fromRow: 3, toCol: 10, toRow: 18 },
      }),
      chartSpec({
        sheet,
        title: "Entregas por tipo de apoyo",
        seriesName: "Cantidad",
        categoryRange: "$A$8:$A$10",
        valueRange: "$B$8:$B$10",
        categories: ["Transporte", "Refrigerios", "Almuerzos"],
        values: [point.transportAllowancesDelivered, point.snacksDelivered, point.lunchesDelivered],
        color: "70549A",
        chartType: "bar",
        anchor: { fromCol: 11, fromRow: 3, toCol: 18, toRow: 18 },
      }),
    ];
  }

  private buildActivitiesSheet(
    workbook: ExcelJS.Workbook,
    dashboard: ReportsDashboardResponse,
  ): NativeChartSpec {
    const sheet = workbook.addWorksheet("Actividades por tipo");
    sheet.columns = [
      { header: "Tipo de actividad", key: "type", width: 42 },
      { header: "Cantidad", key: "count", width: 16 },
    ];
    const activities =
      dashboard.activitiesByType.length > 0
        ? dashboard.activitiesByType.map((activity) => [activity.activityTypeName, activity.count])
        : [["Sin actividades", 0]];
    sheet.addRows(activities);
    for (let column = 4; column <= 12; column += 1) {
      sheet.getColumn(column).width = 11;
    }
    styleWorksheet(sheet);
    return chartSpec({
      sheet,
      title: "Actividades realizadas por tipo",
      seriesName: "Cantidad",
      categoryRange: `$A$2:$A$${activities.length + 1}`,
      valueRange: `$B$2:$B$${activities.length + 1}`,
      categories: activities.map(([name]) => String(name)),
      values: activities.map(([, count]) => Number(count)),
      color: "B47A25",
      chartType: "bar",
      anchor: { fromCol: 3, fromRow: 1, toCol: 11, toRow: 18 },
    });
  }
}

type MonthlyReportPoint = {
  month: string;
  nursingAttendances: number;
  medicalAttendances: number;
  activities: number;
  transportAllowancesDelivered: number;
  snacksDelivered: number;
  lunchesDelivered: number;
};

export function buildMonthlySeries(
  dailySeries: ReportsDashboardResponse["dailySeries"],
): MonthlyReportPoint[] {
  const pointsByMonth = new Map<string, MonthlyReportPoint>();

  for (const point of dailySeries) {
    const month = point.date.slice(0, 7);
    const existing = pointsByMonth.get(month);
    if (existing !== undefined) {
      existing.nursingAttendances += point.nursingAttendances;
      existing.medicalAttendances += point.medicalAttendances;
      existing.activities += point.activities;
      existing.transportAllowancesDelivered += point.transportAllowancesDelivered;
      existing.snacksDelivered += point.snacksDelivered;
      existing.lunchesDelivered += point.lunchesDelivered;
      continue;
    }

    pointsByMonth.set(month, {
      month,
      nursingAttendances: point.nursingAttendances,
      medicalAttendances: point.medicalAttendances,
      activities: point.activities,
      transportAllowancesDelivered: point.transportAllowancesDelivered,
      snacksDelivered: point.snacksDelivered,
      lunchesDelivered: point.lunchesDelivered,
    });
  }

  return [...pointsByMonth.values()];
}

function chartSpec({
  sheet,
  ...spec
}: Omit<NativeChartSpec, "sheetId" | "sheetName"> & {
  sheet: ExcelJS.Worksheet;
}): NativeChartSpec {
  return {
    ...spec,
    sheetId: sheet.id,
    sheetName: sheet.name,
  };
}

async function addNativeCharts(
  workbookBuffer: Buffer,
  chartSpecs: NativeChartSpec[],
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(Uint8Array.from(workbookBuffer));
  const chartsBySheet = new Map<number, NativeChartSpec[]>();

  for (const spec of chartSpecs) {
    const sheetCharts = chartsBySheet.get(spec.sheetId) ?? [];
    sheetCharts.push(spec);
    chartsBySheet.set(spec.sheetId, sheetCharts);
  }

  let chartNumber = nextZipNumber(zip, /^xl\/charts\/chart(\d+)\.xml$/);
  let drawingNumber = nextZipNumber(zip, /^xl\/drawings\/drawing(\d+)\.xml$/);
  let contentTypes = await readZipText(zip, "[Content_Types].xml");
  let contentTypeOverrides = "";

  for (const [sheetId, specs] of chartsBySheet) {
    const drawingId = drawingNumber;
    drawingNumber += 1;
    const chartEntries = specs.map((spec) => {
      const entry = { spec, chartId: chartNumber };
      chartNumber += 1;
      return entry;
    });

    for (const { spec, chartId } of chartEntries) {
      zip.file(`xl/charts/chart${chartId}.xml`, buildChartXml(spec, chartId));
      contentTypeOverrides += `\n<Override PartName="/xl/charts/chart${chartId}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`;
    }

    zip.file(`xl/drawings/drawing${drawingId}.xml`, buildDrawingXml(chartEntries));
    zip.file(
      `xl/drawings/_rels/drawing${drawingId}.xml.rels`,
      buildDrawingRelationships(chartEntries),
    );
    contentTypeOverrides += `\n<Override PartName="/xl/drawings/drawing${drawingId}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`;

    const sheetPath = `xl/worksheets/sheet${sheetId}.xml`;
    const sheetXml = await readZipText(zip, sheetPath);

    const sheetRelsPath = `xl/worksheets/_rels/sheet${sheetId}.xml.rels`;
    const existingRels = zip.file(sheetRelsPath)
      ? await readZipText(zip, sheetRelsPath)
      : undefined;
    const drawingRelationshipId = nextRelationshipId(existingRels ?? "");
    zip.file(sheetPath, addDrawingToWorksheet(sheetXml, `rId${drawingRelationshipId}`));
    zip.file(
      sheetRelsPath,
      addRelationship(
        existingRels,
        drawingRelationshipId,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
        `../drawings/drawing${drawingId}.xml`,
      ),
    );
  }

  zip.file(
    "[Content_Types].xml",
    contentTypes.replace("</Types>", `${contentTypeOverrides}</Types>`),
  );
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}

function buildChartXml(spec: NativeChartSpec, chartId: number): string {
  const sheetReference = `'${spec.sheetName.replaceAll("'", "''")}'!`;
  const categoryFormula = `${sheetReference}${spec.categoryRange}`;
  const valueFormula = `${sheetReference}${spec.valueRange}`;
  const categoryCache = spec.categories
    .map((category, index) => `<c:pt idx="${index}"><c:v>${escapeXml(category)}</c:v></c:pt>`)
    .join("");
  const valueCache = spec.values
    .map((value, index) => `<c:pt idx="${index}"><c:v>${value}</c:v></c:pt>`)
    .join("");
  const categoryAxisId = 100000000 + chartId;
  const valueAxisId = 200000000 + chartId;
  const chartBody =
    spec.chartType === "pie"
      ? buildPieChartXml(spec, categoryFormula, valueFormula, categoryCache, valueCache)
      : buildBarChartXml(
          spec,
          categoryFormula,
          valueFormula,
          categoryCache,
          valueCache,
          categoryAxisId,
          valueAxisId,
        );

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <c:lang val="es-CO"/>
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="es-CO" sz="1400"/><a:t>${escapeXml(spec.title)}</a:t></a:r><a:endParaRPr lang="es-CO"/></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
    <c:plotArea>
      <c:layout/>
      ${chartBody}
    </c:plotArea>
    <c:plotVisOnly val="1"/><c:dispBlanksAs val="zero"/>
  </c:chart>
</c:chartSpace>`;
}

function buildBarChartXml(
  spec: NativeChartSpec,
  categoryFormula: string,
  valueFormula: string,
  categoryCache: string,
  valueCache: string,
  categoryAxisId: number,
  valueAxisId: number,
): string {
  return `<c:barChart>
        <c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>
        <c:ser>
          <c:idx val="0"/><c:order val="0"/>
          <c:tx><c:v>${escapeXml(spec.seriesName)}</c:v></c:tx>
          <c:spPr><a:solidFill><a:srgbClr val="${spec.color}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>
          <c:cat><c:strRef><c:f>${escapeXml(categoryFormula)}</c:f><c:strCache><c:ptCount val="${spec.categories.length}"/>${categoryCache}</c:strCache></c:strRef></c:cat>
          <c:val><c:numRef><c:f>${escapeXml(valueFormula)}</c:f><c:numCache><c:formatCode>0</c:formatCode><c:ptCount val="${spec.values.length}"/>${valueCache}</c:numCache></c:numRef></c:val>
        </c:ser>
        <c:dLbls><c:showVal val="1"/><c:showLegendKey val="0"/><c:showCatName val="0"/><c:showSerName val="0"/></c:dLbls>
        <c:gapWidth val="100"/><c:axId val="${categoryAxisId}"/><c:axId val="${valueAxisId}"/>
      </c:barChart>
      <c:catAx><c:axId val="${categoryAxisId}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:tickLblPos val="nextTo"/><c:crossAx val="${valueAxisId}"/><c:crosses val="autoZero"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx>
      <c:valAx><c:axId val="${valueAxisId}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="0" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${categoryAxisId}"/><c:crosses val="autoZero"/><c:crossBetween val="midCat"/></c:valAx>`;
}

function buildPieChartXml(
  spec: NativeChartSpec,
  categoryFormula: string,
  valueFormula: string,
  categoryCache: string,
  valueCache: string,
): string {
  const dataPoints = (spec.colors ?? [spec.color])
    .map(
      (color, index) =>
        `<c:dPt><c:idx val="${index}"/><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:dPt>`,
    )
    .join("");

  return `<c:pieChart><c:varyColors val="1"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${escapeXml(spec.seriesName)}</c:v></c:tx>${dataPoints}<c:cat><c:strRef><c:f>${escapeXml(categoryFormula)}</c:f><c:strCache><c:ptCount val="${spec.categories.length}"/>${categoryCache}</c:strCache></c:strRef></c:cat><c:val><c:numRef><c:f>${escapeXml(valueFormula)}</c:f><c:numCache><c:formatCode>0</c:formatCode><c:ptCount val="${spec.values.length}"/>${valueCache}</c:numCache></c:numRef></c:val></c:ser><c:dLbls><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="1"/><c:showPercent val="1"/><c:showSerName val="0"/></c:dLbls></c:pieChart><c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>`;
}

function buildDrawingXml(entries: Array<{ spec: NativeChartSpec; chartId: number }>): string {
  const anchors = entries
    .map(
      ({ spec }, index) =>
        `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${spec.anchor.fromCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${spec.anchor.fromRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${spec.anchor.toCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${spec.anchor.toRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${index + 2}" name="Chart ${index + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId${index + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors}</xdr:wsDr>`;
}

function buildDrawingRelationships(
  entries: Array<{ spec: NativeChartSpec; chartId: number }>,
): string {
  const relationships = entries
    .map(
      ({ chartId }, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${chartId}.xml"/>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`;
}

function addDrawingToWorksheet(xml: string, relationshipId: string): string {
  return xml.includes("<drawing ")
    ? xml
    : xml.replace("</worksheet>", `<drawing r:id="${relationshipId}"/></worksheet>`);
}

function addRelationship(
  xml: string | undefined,
  relationshipId: number,
  type: string,
  target: string,
): string {
  const relationship = `<Relationship Id="rId${relationshipId}" Type="${type}" Target="${target}"/>`;
  if (xml !== undefined) {
    return xml.replace("</Relationships>", `${relationship}</Relationships>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationship}</Relationships>`;
}

function nextRelationshipId(xml: string): number {
  const ids = [...xml.matchAll(/Id="rId(\d+)"/g)].map((match) => Number(match[1]));
  return Math.max(0, ...ids) + 1;
}

function nextZipNumber(zip: JSZip, pattern: RegExp): number {
  const numbers = Object.keys(zip.files)
    .map((name) => Number(name.match(pattern)?.[1] ?? 0))
    .filter((value) => value > 0);
  return Math.max(0, ...numbers) + 1;
}

async function readZipText(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  if (file === null) {
    throw new Error(`No se encontró ${path} dentro del archivo Excel.`);
  }
  return file.async("string");
}

function formatMonthTitle(value: string): string {
  const label = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${value}-01T00:00:00Z`))
    .replace(" de ", " ");

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatMonthSheetName(value: string): string {
  return formatMonthTitle(value);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function styleWorksheet(sheet: ExcelJS.Worksheet): void {
  styleHeaderRow(sheet.getRow(1));
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of sheet.getRows(2, sheet.rowCount - 1) ?? []) {
    row.alignment = { vertical: "top", wrapText: true };
  }
}

function styleHeaderRow(header: ExcelJS.Row): void {
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF085041" } };
  header.alignment = { vertical: "middle", wrapText: true };
}

function styleTitle(cell: ExcelJS.Cell, size: number): void {
  cell.font = { bold: true, color: { argb: "FF123B31" }, size };
  cell.alignment = { vertical: "middle" };
}

function styleSubtitle(cell: ExcelJS.Cell): void {
  cell.font = { color: { argb: "FF657A72" }, italic: true };
  cell.alignment = { vertical: "middle" };
}
