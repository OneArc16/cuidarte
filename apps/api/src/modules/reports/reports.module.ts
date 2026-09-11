import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { ActividadesGrupalesModule } from "../actividades-grupales/actividades-grupales.module";
import { AlimentacionModule } from "../alimentacion/alimentacion.module";
import { AuthModule } from "../auth/auth.module";
import { ReportsService, LocalReportsQueue } from "./application/reports.service";
import { REPORT_ARCHIVE_WRITER } from "./domain/report-archive-writer";
import { REPORT_FILES_STORAGE } from "./domain/report-files.storage";
import { REPORTS_REPOSITORY } from "./domain/reports.repository";
import { ActividadesGrupalesReportSource } from "./infrastructure/actividades-grupales-report.source";
import { AlimentacionReportSource } from "./infrastructure/alimentacion-report.source";
import { DrizzleReportsRepository } from "./infrastructure/drizzle-reports.repository";
import { LocalReportFilesStorage } from "./infrastructure/local-report-files.storage";
import { StreamingReportZipWriter } from "./infrastructure/streaming-report-zip-writer";
import { ReportsController } from "./presentation/reports.controller";

@Module({
  imports: [AuthModule, DatabaseModule, AlimentacionModule, ActividadesGrupalesModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    LocalReportsQueue,
    AlimentacionReportSource,
    ActividadesGrupalesReportSource,
    {
      provide: REPORTS_REPOSITORY,
      useClass: DrizzleReportsRepository,
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
