import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { type AuthUser, type CreateReportsDashboardExportRequest, type ReportsDashboardExport, type ReportAnalyticsExportFormat } from "@cuidarte/contracts";
import { ConflictException, Inject, Injectable, NotFoundException, OnModuleInit, StreamableFile } from "@nestjs/common";

import { ReportsAnalyticsExportQueue } from "./reports-analytics-export.queue";
import { ReportsDashboardExcelService } from "./reports-dashboard-excel.service";
import { ReportsDashboardPdfService } from "./reports-dashboard-pdf.service";
import { ReportsDashboardPptxService } from "./reports-dashboard-pptx.service";
import { REPORT_FILES_STORAGE, type ReportFilesStorage } from "../domain/report-files.storage";
import { assertCanUseReports, resolveReportTenantId } from "../domain/report.policy";
import { REPORTS_ANALYTICS_EXPORTS_REPOSITORY, type ReportsAnalyticsExportRecord, type ReportsAnalyticsExportsRepository } from "../domain/reports-analytics-export.types";

const READY_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ReportsAnalyticsExportService implements OnModuleInit {
  constructor(
    @Inject(REPORTS_ANALYTICS_EXPORTS_REPOSITORY) private readonly repository: ReportsAnalyticsExportsRepository,
    @Inject(REPORT_FILES_STORAGE) private readonly storage: ReportFilesStorage,
    private readonly queue: ReportsAnalyticsExportQueue,
    private readonly excel: ReportsDashboardExcelService,
    private readonly pdf: ReportsDashboardPdfService,
    private readonly pptx: ReportsDashboardPptxService,
  ) { this.queue.registerProcessor((id) => this.process(id)); }

  onModuleInit() { return undefined; }

  async create(command: CreateReportsDashboardExportRequest, actor: AuthUser): Promise<ReportsDashboardExport> {
    assertCanUseReports(actor);
    const tenantId = actor.role === "super_admin" ? null : resolveReportTenantId(actor, null);
    const tenantName = tenantId === null ? null : "Centro";
    const record = await this.repository.create({ ...command, tenantId, tenantName, requestedByUserId: actor.id, requestedByRole: actor.role, downloadFilename: `estadisticas-reportes-${command.from}-${command.to}.${command.format}` });
    await this.queue.enqueue(record.id);
    return this.toResponse(record);
  }

  async list(actor: AuthUser) { assertCanUseReports(actor); const records = await this.repository.list(); return records.filter((item) => actor.role === "super_admin" || item.tenantId === actor.tenantId).map((item) => this.toResponse(item)); }
  async get(id: string, actor: AuthUser) { return this.toResponse(await this.findPermitted(id, actor)); }

  async cancel(id: string, actor: AuthUser) {
    const current = await this.findPermitted(id, actor);
    if (!["pending", "processing"].includes(current.status)) throw new ConflictException("Esta exportacion ya no se puede cancelar.");
    const cancelled = await this.repository.cancel(id);
    if (!cancelled) throw new NotFoundException("Exportacion no encontrada.");
    return this.toResponse(cancelled);
  }

  async download(id: string, actor: AuthUser): Promise<{ file: StreamableFile; filename: string; sizeBytes: number }> {
    const item = await this.findPermitted(id, actor);
    if (item.status !== "ready" || !item.storageKey || !item.expiresAt || item.expiresAt <= new Date()) throw new ConflictException("La exportacion no esta lista para descargar.");
    const stored = await this.storage.read(item.storageKey);
    return { file: new StreamableFile(createReadStream(stored.absolutePath)), filename: item.downloadFilename ?? `${item.id}.${item.format}`, sizeBytes: stored.sizeBytes };
  }

  private async process(id: string): Promise<void> {
    const item = await this.repository.markProcessing(id, new Date());
    if (!item || item.status !== "processing") return;
    try {
      await this.repository.updateProgress(id, 10);
      const actor: AuthUser = { id: item.requestedByUserId, tenantId: item.tenantId, email: "report-worker@cuidarte.local", fullName: "Worker de reportes", role: item.requestedByRole, passwordSetByAdmin: false };
      const query = { from: item.from, to: item.to };
      const result = item.format === "xlsx" ? await this.excel.exportExcel(query, actor) : item.format === "pdf" ? await this.pdf.exportPdf(query, actor) : await this.pptx.exportPptx(query, actor);
      await this.repository.updateProgress(id, 85);
      const reserved = await this.storage.reserve(id);
      const current = await this.repository.findById(id);
      if (current?.status === "cancelled") {
        await this.storage.deleteTemporaryFiles(id);
        return;
      }
      await writeFile(reserved.temporaryPath, result.buffer);
      await this.storage.commit(reserved.temporaryPath, reserved.absolutePath, reserved.storageKey);
      const ready = await this.repository.markReady(id, reserved.storageKey, new Date(Date.now() + READY_TTL_MS), new Date());
      if (!ready) await this.storage.delete(reserved.storageKey);
    } catch (error) {
      await this.repository.markFailed(id, error instanceof Error ? error.message : "No fue posible generar la exportacion.");
      throw error;
    }
  }

  private async findPermitted(id: string, actor: AuthUser): Promise<ReportsAnalyticsExportRecord> {
    assertCanUseReports(actor);
    const item = await this.repository.findById(id);
    if (!item || (actor.role !== "super_admin" && item.tenantId !== actor.tenantId)) throw new NotFoundException("Exportacion no encontrada.");
    return item;
  }

  private toResponse(item: ReportsAnalyticsExportRecord): ReportsDashboardExport {
    return { id: item.id, format: item.format, status: item.status, from: item.from, to: item.to, tenantId: item.tenantId, tenantName: item.tenantName, requestedByUserId: item.requestedByUserId, progress: item.progress, downloadFilename: item.downloadFilename, errorMessage: item.errorMessage, downloadAvailable: item.status === "ready" && item.expiresAt !== null && item.expiresAt > new Date(), expiresAt: item.expiresAt?.toISOString() ?? null, startedAt: item.startedAt?.toISOString() ?? null, completedAt: item.completedAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() };
  }
}
