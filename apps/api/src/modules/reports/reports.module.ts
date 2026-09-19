import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { ActividadesGrupalesModule } from "../actividades-grupales/actividades-grupales.module";
import { AlimentacionModule } from "../alimentacion/alimentacion.module";
import { AuthModule } from "../auth/auth.module";
import { TenantBrandingModule } from "../tenant-branding/tenant-branding.module";
import { ReportJobsQueue } from "./application/report-jobs.queue";
import { ReportsDashboardService } from "./application/reports-dashboard.service";
import { ReportsDashboardExcelService } from "./application/reports-dashboard-excel.service";
import { ReportsDashboardPdfService } from "./application/reports-dashboard-pdf.service";
import { ReportsDashboardPptxService } from "./application/reports-dashboard-pptx.service";
import { ReportsService } from "./application/reports.service";
import { ReportsAnalyticsExportQueue } from "./application/reports-analytics-export.queue";
import { ReportsAnalyticsExportService } from "./application/reports-analytics-export.service";
import { REPORT_ARCHIVE_WRITER } from "./domain/report-archive-writer";
import { REPORT_FILES_STORAGE } from "./domain/report-files.storage";
import { REPORTS_REPOSITORY } from "./domain/reports.repository";
import { REPORTS_ANALYTICS_EXPORTS_REPOSITORY } from "./domain/reports-analytics-export.types";
import { REPORTS_DASHBOARD_REPOSITORY } from "./domain/reports-dashboard.repository";
import { ActividadesGrupalesReportSource } from "./infrastructure/actividades-grupales-report.source";
import { AlimentacionReportSource } from "./infrastructure/alimentacion-report.source";
import { DrizzleReportsRepository } from "./infrastructure/drizzle-reports.repository";
import { DrizzleReportsAnalyticsExportsRepository } from "./infrastructure/drizzle-reports-analytics-exports.repository";
import { DrizzleReportsDashboardRepository } from "./infrastructure/drizzle-reports-dashboard.repository";
import { LocalReportFilesStorage } from "./infrastructure/local-report-files.storage";
import { StreamingReportZipWriter } from "./infrastructure/streaming-report-zip-writer";
import { ReportsController } from "./presentation/reports.controller";

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    AlimentacionModule,
    ActividadesGrupalesModule,
    TenantBrandingModule,
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsAnalyticsExportService,
    ReportsDashboardService,
    ReportsDashboardExcelService,
    ReportsDashboardPdfService,
    ReportsDashboardPptxService,
    ReportJobsQueue,
    ReportsAnalyticsExportQueue,
    AlimentacionReportSource,
    ActividadesGrupalesReportSource,
    {
      provide: REPORTS_REPOSITORY,
      useClass: DrizzleReportsRepository,
    },
    {
      provide: REPORTS_ANALYTICS_EXPORTS_REPOSITORY,
      useClass: DrizzleReportsAnalyticsExportsRepository,
    },
    {
      provide: REPORTS_DASHBOARD_REPOSITORY,
      useClass: DrizzleReportsDashboardRepository,
    },
    {
      provide: REPORT_FILES_STORAGE,
      useClass: LocalReportFilesStorage,
    },
    {
      provide: REPORT_ARCHIVE_WRITER,
      useClass: StreamingReportZipWriter,
    },
  ],
})
export class ReportsModule {}
