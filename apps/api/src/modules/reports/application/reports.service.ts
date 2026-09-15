import { createReadStream } from "node:fs";

import {
  type AuthUser,
  type CreateReportRequest,
  type ReportAvailabilityQuery,
  type ReportJob,
  type ReportListQuery,
  type ReportType,
} from "@cuidarte/contracts";
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  StreamableFile,
} from "@nestjs/common";

import { getEnv } from "../../../config/env";
import { ReportJobsQueue, type ReportJobAttemptContext } from "./report-jobs.queue";
import { REPORT_ARCHIVE_WRITER, type ReportArchiveWriter } from "../domain/report-archive-writer";
import { REPORT_FILES_STORAGE, type ReportFilesStorage } from "../domain/report-files.storage";
import { buildReportZipFilename, deduplicateFilename } from "../domain/report-filenames";
import {
  assertCanAccessReportJob,
  assertCanUseReports,
  canCancelReportStatus,
  resolveReportTenantId,
} from "../domain/report.policy";
import { type ReportSource, type ReportJobRecord } from "../domain/report.types";
import { REPORTS_REPOSITORY, type ReportsRepository } from "../domain/reports.repository";
import { ActividadesGrupalesReportSource } from "../infrastructure/actividades-grupales-report.source";
import { AlimentacionReportSource } from "../infrastructure/alimentacion-report.source";

const READY_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ReportsService implements OnModuleInit {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @Inject(REPORTS_REPOSITORY)
    private readonly reportsRepository: ReportsRepository,
    @Inject(REPORT_FILES_STORAGE)
    private readonly filesStorage: ReportFilesStorage,
    @Inject(REPORT_ARCHIVE_WRITER)
    private readonly archiveWriter: ReportArchiveWriter,
    private readonly alimentacionSource: AlimentacionReportSource,
    private readonly actividadesSource: ActividadesGrupalesReportSource,
    private readonly queue: ReportJobsQueue,
  ) {
    this.queue.registerProcessor((reportId, context) => this.processReport(reportId, context));
  }

  onModuleInit(): void {
    void this.cleanupExpiredReports().catch(() => undefined);
    void this.recoverAbandonedReports().catch((error) => {
      this.logger.error(
        `event=reports_recovery_failed reason=${error instanceof Error ? error.message : "UnknownError"}`,
        error instanceof Error ? error.stack : undefined,
      );
    });
    setInterval(
      () => {
        void this.cleanupExpiredReports().catch(() => undefined);
        void this.recoverAbandonedReports().catch(() => undefined);
      },
      60 * 60 * 1000,
    ).unref();
  }

  async getAvailability(query: ReportAvailabilityQuery, actor: AuthUser) {
    const scope = await this.resolveScope(actor, query.tenantId);
    const source = this.resolveSource(query.type);
    const availability = await source.count(scope, query.period);

    return {
      ...availability,
      hasDocuments: availability.availableDocuments > 0,
    };
  }

  async createReport(command: CreateReportRequest, actor: AuthUser): Promise<ReportJob> {
    const scope = await this.resolveScope(actor, command.tenantId);
    const source = this.resolveSource(command.type);
    const availability = await source.count(scope, command.period);

    if (availability.availableDocuments === 0) {
      throw new ConflictException("No hay documentos para generar este reporte.");
    }

    const duplicate = await this.reportsRepository.findActiveDuplicate({
      tenantId: scope.tenantId,
      type: command.type,
      period: command.period,
    });

    if (duplicate !== null) {
      return this.toResponseJob(duplicate);
    }

    const report = await this.reportsRepository.createJob({
      tenantId: scope.tenantId,
      tenantName: scope.tenantName,
      requestedByUserId: actor.id,
      requestedByRole: actor.role,
      type: command.type,
      period: command.period,
      downloadFilename: buildReportZipFilename({
        type: command.type,
        tenantName: scope.tenantName,
        period: command.period,
      }),
    });

    await this.reportsRepository.createAudit({
      actorUserId: actor.id,
      targetTenantId: scope.tenantId,
      action: "reports.requested",
      summary: `Reporte solicitado (${command.type}, ${command.period})`,
      metadata: {
        reportId: report.id,
        type: command.type,
        period: command.period,
        availableDocuments: availability.availableDocuments,
      },
    });
    await this.queue.enqueue(report.id);

    return this.toResponseJob(report);
  }

  async getReport(reportId: string, actor: AuthUser): Promise<ReportJob> {
    const report = await this.findPermittedReport(reportId, actor);

    return this.toResponseJob(report);
  }

  async listReports(query: ReportListQuery, actor: AuthUser): Promise<ReportJob[]> {
    assertCanUseReports(actor);
    const scopeTenantId = actor.role === "super_admin" ? null : resolveReportTenantId(actor, null);
    const reports = await this.reportsRepository.listJobs({
      type: query.type ?? null,
      period: query.period ?? null,
      tenantId: query.tenantId,
      scopeTenantId,
    });

    return reports.map((report) => this.toResponseJob(report));
  }

  async cancelReport(reportId: string, actor: AuthUser): Promise<ReportJob> {
    const report = await this.findPermittedReport(reportId, actor);

    if (!canCancelReportStatus(report.status)) {
      throw new ConflictException("Este reporte ya no se puede cancelar.");
    }

    const cancelled = await this.reportsRepository.cancel(report.id, new Date());

    if (cancelled === null) {
      throw new NotFoundException("Reporte no encontrado.");
    }

    await this.reportsRepository.createAudit({
      actorUserId: actor.id,
      targetTenantId: report.tenantId,
      action: "reports.cancelled",
      summary: `Reporte cancelado (${report.type}, ${report.period})`,
      metadata: { reportId: report.id, type: report.type, period: report.period },
    });

    return this.toResponseJob(cancelled);
  }

  async downloadReport(
    reportId: string,
    actor: AuthUser,
  ): Promise<{
    file: StreamableFile;
    filename: string;
    sizeBytes: number;
  }> {
    const report = await this.findPermittedReport(reportId, actor);

    if (report.status !== "ready" || report.storageKey === null || report.expiresAt === null) {
      throw new ConflictException("El reporte no esta listo para descargar.");
    }

    if (report.expiresAt <= new Date()) {
      throw new ConflictException("El reporte expiro. Genera uno nuevo.");
    }

    const stored = await this.filesStorage.read(report.storageKey);

    await this.reportsRepository.createAudit({
      actorUserId: actor.id,
      targetTenantId: report.tenantId,
      action: "reports.downloaded",
      summary: `Reporte descargado (${report.type}, ${report.period})`,
      metadata: { reportId: report.id, type: report.type, period: report.period },
    });

    return {
      file: new StreamableFile(createReadStream(stored.absolutePath)),
      filename: report.downloadFilename ?? buildReportZipFilename(report),
      sizeBytes: stored.sizeBytes,
    };
  }

  async processReport(
    reportId: string,
    context: ReportJobAttemptContext = { attempt: 1, maxAttempts: 1 },
  ): Promise<void> {
    const startedAt = new Date();
    const report = await this.reportsRepository.markProcessing(reportId, startedAt);

    if (report === null || report.status !== "processing") {
      return;
    }

    const actor: AuthUser = {
      id: report.requestedByUserId,
      tenantId: report.tenantId,
      email: "report-worker@cuidarte.local",
      fullName: "Worker de reportes",
      role: report.requestedByRole,
      passwordSetByAdmin: false,
    };
    const source = this.resolveSource(report.type);
    const availability = await source.count(report, report.period);
    this.logger.log(
      `reportId=${report.id} tenantId=${report.tenantId} type=${report.type} period=${report.period} event=report_started attempt=${context.attempt}/${context.maxAttempts} availableDocuments=${availability.availableDocuments}`,
    );

    if (availability.availableDocuments === 0) {
      await this.reportsRepository.markFinished({
        reportId: report.id,
        status: "empty",
        totalDocuments: 0,
        processedDocuments: 0,
        failedDocuments: 0,
        storageKey: null,
        expiresAt: null,
        completedAt: new Date(),
      });
      return;
    }

    const deletedTemporaryFiles = await this.filesStorage.deleteTemporaryFiles(report.id);
    if (deletedTemporaryFiles > 0) {
      this.logger.warn(
        `reportId=${report.id} tenantId=${report.tenantId} type=${report.type} period=${report.period} event=temporary_files_cleaned count=${deletedTemporaryFiles}`,
      );
    }

    const reservedFile = await this.filesStorage.reserve(report.id);
    let processedDocuments = 0;
    let failedDocuments = 0;

    try {
      const usedFilenames = new Set<string>();
      const repository = this.reportsRepository;
      const logger = this.logger;
      const entries = async function* (
        documents: AsyncIterable<{ filename: string; buffer: Buffer }>,
      ) {
        for await (const document of documents) {
          const current = await repository.findJobById(report.id);

          if (current?.status === "cancelled") {
            throw new ReportCancelledError();
          }

          processedDocuments += 1;
          await repository.updateProgress(report.id, processedDocuments, failedDocuments);
          if (processedDocuments === 1 || processedDocuments % 50 === 0) {
            logger.log(
              `reportId=${report.id} tenantId=${report.tenantId} type=${report.type} period=${report.period} event=report_progress processedDocuments=${processedDocuments} failedDocuments=${failedDocuments}`,
            );
          }

          yield {
            filename: deduplicateFilename(document.filename, usedFilenames),
            buffer: document.buffer,
          };
        }
      };

      await this.archiveWriter.writeZip(
        entries(source.documents(report, report.period, actor)),
        reservedFile.temporaryPath,
      );
      const currentBeforeCommit = await this.reportsRepository.findJobById(report.id);

      if (currentBeforeCommit?.status === "cancelled") {
        throw new ReportCancelledError();
      }

      const stored = await this.filesStorage.commit(
        reservedFile.temporaryPath,
        reservedFile.absolutePath,
        reservedFile.storageKey,
      );
      const currentAfterCommit = await this.reportsRepository.findJobById(report.id);

      if (currentAfterCommit?.status === "cancelled") {
        await this.filesStorage.delete(stored.storageKey).catch(() => undefined);
        this.logger.warn(
          `reportId=${report.id} tenantId=${report.tenantId} type=${report.type} period=${report.period} event=report_cancelled_after_commit`,
        );
        return;
      }

      const completedAt = new Date();
      const expiresAt = new Date(completedAt.getTime() + READY_TTL_MS);

      await this.reportsRepository.markFinished({
        reportId: report.id,
        status: "ready",
        totalDocuments: availability.availableDocuments,
        processedDocuments,
        failedDocuments,
        storageKey: stored.storageKey,
        expiresAt,
        completedAt,
      });
      await this.reportsRepository.createAudit({
        actorUserId: report.requestedByUserId,
        targetTenantId: report.tenantId,
        action: "reports.ready",
        summary: `Reporte listo (${report.type}, ${report.period})`,
        metadata: {
          reportId: report.id,
          type: report.type,
          period: report.period,
          processedDocuments,
          failedDocuments,
          sizeBytes: stored.sizeBytes,
        },
      });
      this.logger.log(
        `reportId=${report.id} tenantId=${report.tenantId} type=${report.type} period=${report.period} event=report_ready durationMs=${completedAt.getTime() - startedAt.getTime()} processedDocuments=${processedDocuments} failedDocuments=${failedDocuments} sizeBytes=${stored.sizeBytes}`,
      );
    } catch (error) {
      await this.filesStorage.deleteTemporaryFiles(report.id).catch(() => undefined);

      if (error instanceof ReportCancelledError) {
        await this.filesStorage.delete(reservedFile.storageKey).catch(() => undefined);
        this.logger.warn(
          `reportId=${report.id} tenantId=${report.tenantId} type=${report.type} period=${report.period} event=report_cancelled attempt=${context.attempt}/${context.maxAttempts}`,
        );
        return;
      }

      failedDocuments += 1;
      await this.filesStorage.delete(reservedFile.storageKey).catch(() => undefined);

      if (context.attempt < context.maxAttempts) {
        this.logger.warn(
          `reportId=${report.id} tenantId=${report.tenantId} type=${report.type} period=${report.period} event=report_retry_scheduled attempt=${context.attempt}/${context.maxAttempts} reason=${error instanceof Error ? error.message : "UnknownError"}`,
        );
        throw error;
      }

      const current = await this.reportsRepository.findJobById(report.id);
      if (current?.status === "cancelled") {
        this.logger.warn(
          `reportId=${report.id} tenantId=${report.tenantId} type=${report.type} period=${report.period} event=report_failed_after_cancel_preserved`,
        );
        return;
      }

      const errorCode =
        context.maxAttempts > 1 ? "REPORT_RETRY_EXHAUSTED" : "REPORT_GENERATION_FAILED";
      await this.reportsRepository.markFailed(report.id, errorCode, new Date());
      await this.reportsRepository.createAudit({
        actorUserId: report.requestedByUserId,
        targetTenantId: report.tenantId,
        action: "reports.failed",
        summary: `Reporte fallido (${report.type}, ${report.period})`,
        metadata: {
          reportId: report.id,
          type: report.type,
          period: report.period,
          errorName: error instanceof Error ? error.name : "UnknownError",
        },
      });
      this.logger.error(
        `reportId=${report.id} tenantId=${report.tenantId} type=${report.type} period=${report.period} event=report_failed attempt=${context.attempt}/${context.maxAttempts} processedDocuments=${processedDocuments} failedDocuments=${failedDocuments} reason=${error instanceof Error ? error.message : "UnknownError"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async recoverAbandonedReports(): Promise<void> {
    const env = getEnv();
    const staleBefore = new Date(Date.now() - env.REPORT_JOB_STALE_TIMEOUT_MS);
    const recoverableReports = await this.reportsRepository.findRecoverableJobs(staleBefore);

    for (const report of recoverableReports) {
      const deletedTemporaryFiles = await this.filesStorage.deleteTemporaryFiles(report.id);
      await this.queue.enqueue(report.id);
      this.logger.warn(
        `reportId=${report.id} tenantId=${report.tenantId} type=${report.type} period=${report.period} event=report_recovery_enqueued status=${report.status} staleTimeoutMs=${env.REPORT_JOB_STALE_TIMEOUT_MS} deletedTemporaryFiles=${deletedTemporaryFiles}`,
      );
    }
  }

  private async cleanupExpiredReports(): Promise<void> {
    const now = new Date();
    const expiredReports = await this.reportsRepository.findExpiredReadyJobs(now);

    for (const report of expiredReports) {
      if (report.storageKey !== null) {
        await this.filesStorage.delete(report.storageKey).catch(() => undefined);
      }
    }

    await this.reportsRepository.expireReadyJobs(now);
  }

  private async resolveScope(actor: AuthUser, requestedTenantId: string | null) {
    const tenantId = resolveReportTenantId(actor, requestedTenantId);
    const tenant = await this.reportsRepository.findTenantById(tenantId);

    if (tenant === null) {
      throw new NotFoundException("Centro no encontrado.");
    }

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
    };
  }

  private async findPermittedReport(reportId: string, actor: AuthUser): Promise<ReportJobRecord> {
    const report = await this.reportsRepository.findJobById(reportId);

    if (report === null) {
      throw new NotFoundException("Reporte no encontrado.");
    }

    assertCanAccessReportJob(actor, report);

    return report;
  }

  private resolveSource(type: ReportType): ReportSource {
    return type === "FORMATOS_ENTREGA_ALIMENTACION"
      ? this.alimentacionSource
      : this.actividadesSource;
  }

  private toResponseJob(report: ReportJobRecord): ReportJob {
    return {
      id: report.id,
      type: report.type,
      status: report.status,
      period: report.period,
      tenantId: report.tenantId,
      tenantName: report.tenantName,
      requestedByUserId: report.requestedByUserId,
      totalDocuments: report.totalDocuments,
      processedDocuments: report.processedDocuments,
      failedDocuments: report.failedDocuments,
      downloadFilename: report.downloadFilename,
      errorCode: report.errorCode,
      message: resolveReportMessage(report),
      downloadAvailable:
        report.status === "ready" && report.expiresAt !== null && report.expiresAt > new Date(),
      expiresAt: report.expiresAt?.toISOString() ?? null,
      startedAt: report.startedAt?.toISOString() ?? null,
      completedAt: report.completedAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    };
  }
}

class ReportCancelledError extends Error {
  constructor() {
    super("Reporte cancelado.");
    this.name = "ReportCancelledError";
  }
}

function resolveReportMessage(report: ReportJobRecord): string | null {
  switch (report.status) {
    case "pending":
      return "Reporte en cola.";
    case "processing":
      return "Reporte en procesamiento.";
    case "ready":
      return "Reporte listo para descargar.";
    case "empty":
      return "No se encontraron documentos para el centro y mes seleccionados.";
    case "failed":
      return "No fue posible generar el reporte.";
    case "cancelled":
      return "Reporte cancelado.";
    case "expired":
      return "El reporte expiro. Genera uno nuevo.";
  }
}
