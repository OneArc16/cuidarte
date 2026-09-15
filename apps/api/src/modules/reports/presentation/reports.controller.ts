import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiProduces, ApiTags } from "@nestjs/swagger";
import { type FastifyReply } from "fastify";
import { z } from "zod";
import {
  cancelReportResponseSchema,
  createReportRequestSchema,
  createReportResponseSchema,
  reportAvailabilityQuerySchema,
  reportAvailabilityResponseSchema,
  reportListQuerySchema,
  reportListResponseSchema,
  reportsDashboardQuerySchema,
  reportsDashboardResponseSchema,
  reportStatusResponseSchema,
  createReportsDashboardExportRequestSchema,
  reportsDashboardExportResponseSchema,
  reportsDashboardExportListResponseSchema,
} from "@cuidarte/contracts";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { RequireRoles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { SessionGuard } from "../../auth/session.guard";
import { ReportsService } from "../application/reports.service";
import { ReportsDashboardService } from "../application/reports-dashboard.service";
import { ReportsDashboardExcelService } from "../application/reports-dashboard-excel.service";
import { ReportsDashboardPdfService } from "../application/reports-dashboard-pdf.service";
import { ReportsDashboardPptxService } from "../application/reports-dashboard-pptx.service";
import { ReportsAnalyticsExportService } from "../application/reports-analytics-export.service";

const reportIdParamSchema = z.uuid();

@ApiTags("reports")
@ApiBearerAuth()
@Controller("reports")
@UseGuards(SessionGuard, RolesGuard)
@RequireRoles("super_admin", "admin", "director")
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportsDashboardService: ReportsDashboardService,
    private readonly reportsDashboardExcelService: ReportsDashboardExcelService,
    private readonly reportsDashboardPdfService: ReportsDashboardPdfService,
    private readonly reportsDashboardPptxService: ReportsDashboardPptxService,
    private readonly reportsAnalyticsExportService: ReportsAnalyticsExportService,
  ) {}

  @Get("dashboard.pdf")
  @ApiProduces("application/pdf")
  async exportDashboardPdf(
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
    @Res() reply: FastifyReply,
  ) {
    const parsedQuery = parseZodSchema(reportsDashboardQuerySchema, query);
    const file = await this.reportsDashboardPdfService.exportPdf(parsedQuery, request.currentUser);

    reply
      .header("Content-Type", file.contentType)
      .header("Content-Disposition", `attachment; filename="${file.filename}"`)
      .send(file.buffer);
  }

  @Get("dashboard.pptx")
  @ApiProduces("application/vnd.openxmlformats-officedocument.presentationml.presentation")
  async exportDashboardPptx(
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
    @Res() reply: FastifyReply,
  ) {
    const parsedQuery = parseZodSchema(reportsDashboardQuerySchema, query);
    const file = await this.reportsDashboardPptxService.exportPptx(
      parsedQuery,
      request.currentUser,
    );

    reply
      .header("Content-Type", file.contentType)
      .header("Content-Disposition", `attachment; filename="${file.filename}"`)
      .send(file.buffer);
  }

  @Get("dashboard.xlsx")
  @ApiProduces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  async exportDashboardExcel(
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
    @Res() reply: FastifyReply,
  ) {
    const parsedQuery = parseZodSchema(reportsDashboardQuerySchema, query);
    const file = await this.reportsDashboardExcelService.exportExcel(
      parsedQuery,
      request.currentUser,
    );

    reply
      .header("Content-Type", file.contentType)
      .header("Content-Disposition", `attachment; filename="${file.filename}"`)
      .send(file.buffer);
  }

  @Get("dashboard")
  @ApiOkResponse({ description: "Estadisticas agregadas de reportes por rango de fecha." })
  async getDashboard(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(reportsDashboardQuerySchema, query);
    const dashboard = await this.reportsDashboardService.getDashboard(
      parsedQuery,
      request.currentUser,
    );

    return reportsDashboardResponseSchema.parse(dashboard);
  }

  @Post("exports")
  @HttpCode(HttpStatus.ACCEPTED)
  async createDashboardExport(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const command = parseZodSchema(createReportsDashboardExportRequestSchema, body);
    return reportsDashboardExportResponseSchema.parse({ export: await this.reportsAnalyticsExportService.create(command, request.currentUser) });
  }

  @Get("exports")
  async listDashboardExports(@Req() request: AuthenticatedRequest) {
    return reportsDashboardExportListResponseSchema.parse({ exports: await this.reportsAnalyticsExportService.list(request.currentUser) });
  }

  @Get("exports/:exportId")
  async getDashboardExport(@Param("exportId") exportId: string, @Req() request: AuthenticatedRequest) {
    return reportsDashboardExportResponseSchema.parse({ export: await this.reportsAnalyticsExportService.get(parseZodSchema(reportIdParamSchema, exportId), request.currentUser) });
  }

  @Post("exports/:exportId/cancel")
  async cancelDashboardExport(@Param("exportId") exportId: string, @Req() request: AuthenticatedRequest) {
    return reportsDashboardExportResponseSchema.parse({ export: await this.reportsAnalyticsExportService.cancel(parseZodSchema(reportIdParamSchema, exportId), request.currentUser) });
  }

  @Get("exports/:exportId/download")
  async downloadDashboardExport(@Param("exportId") exportId: string, @Req() request: AuthenticatedRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<StreamableFile> {
    const download = await this.reportsAnalyticsExportService.download(parseZodSchema(reportIdParamSchema, exportId), request.currentUser);
    reply.header("Content-Disposition", `attachment; filename="${download.filename}"`).header("Content-Length", String(download.sizeBytes));
    return download.file;
  }

  @Get("availability")
  @ApiOkResponse({ description: "Disponibilidad mensual del reporte." })
  async getAvailability(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(reportAvailabilityQuerySchema, query);
    const availability = await this.reportsService.getAvailability(
      parsedQuery,
      request.currentUser,
    );

    return reportAvailabilityResponseSchema.parse({
      ...availability,
      hasDocuments: availability.availableDocuments > 0,
    });
  }

  @Get()
  @ApiOkResponse({ description: "Historial reciente de reportes." })
  async listReports(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(reportListQuerySchema, query);
    const reports = await this.reportsService.listReports(parsedQuery, request.currentUser);

    return reportListResponseSchema.parse({ reports });
  }

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOkResponse({ description: "Tarea de reporte creada." })
  async createReport(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const command = parseZodSchema(createReportRequestSchema, body);
    const report = await this.reportsService.createReport(command, request.currentUser);

    return createReportResponseSchema.parse({ report });
  }

  @Get(":reportId")
  @ApiOkResponse({ description: "Estado del reporte." })
  async getReport(@Param("reportId") reportIdValue: string, @Req() request: AuthenticatedRequest) {
    const reportId = parseZodSchema(reportIdParamSchema, reportIdValue);
    const report = await this.reportsService.getReport(reportId, request.currentUser);

    return reportStatusResponseSchema.parse({ report });
  }

  @Post(":reportId/cancel")
  @ApiOkResponse({ description: "Reporte cancelado." })
  async cancelReport(
    @Param("reportId") reportIdValue: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const reportId = parseZodSchema(reportIdParamSchema, reportIdValue);
    const report = await this.reportsService.cancelReport(reportId, request.currentUser);

    return cancelReportResponseSchema.parse({ report });
  }

  @Get(":reportId/download")
  @ApiProduces("application/zip")
  @Header("Content-Type", "application/zip")
  async downloadReport(
    @Param("reportId") reportIdValue: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<StreamableFile> {
    const reportId = parseZodSchema(reportIdParamSchema, reportIdValue);
    const download = await this.reportsService.downloadReport(reportId, request.currentUser);

    reply.header("Content-Disposition", `attachment; filename="${download.filename}"`);
    reply.header("Content-Length", String(download.sizeBytes));

    return download.file;
  }
}
