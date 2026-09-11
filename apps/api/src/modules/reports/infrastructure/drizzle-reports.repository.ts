import { Injectable } from "@nestjs/common";
import { and, desc, eq, gt, inArray, lt, or, type SQL } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import { auditLogs, reportJobs, tenants } from "../../../database/schema";
import { assertReportStatusTransition } from "../domain/report-status";
import {
  type CreateReportJobCommand,
  type ReportJobRecord,
  type ReportListFilters,
} from "../domain/report.types";
import { type ReportsRepository } from "../domain/reports.repository";

@Injectable()
export class DrizzleReportsRepository implements ReportsRepository {
  constructor(private readonly database: DatabaseService) {}

  async findTenantById(tenantId: string): Promise<{ id: string; name: string } | null> {
    const [row] = await this.database.db
      .select({ id: tenants.id, name: tenants.name })
      .from(tenants)
      .where(and(eq(tenants.id, tenantId), eq(tenants.isActive, true)))
      .limit(1);

    return row ?? null;
  }

  async findActiveDuplicate(command: {
    tenantId: string;
    type: CreateReportJobCommand["type"];
    period: string;
    now: Date;
  }): Promise<ReportJobRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(reportJobs)
      .where(
        and(
          eq(reportJobs.tenantId, command.tenantId),
          eq(reportJobs.type, command.type),
          eq(reportJobs.period, command.period),
          or(
            inArray(reportJobs.status, ["pending", "processing"]),
            and(eq(reportJobs.status, "ready"), gt(reportJobs.expiresAt, command.now)),
          ),
        ),
      )
      .orderBy(desc(reportJobs.createdAt))
      .limit(1);

    return row === undefined ? null : this.toRecord(row);
  }

  async createJob(command: CreateReportJobCommand): Promise<ReportJobRecord> {
    const [row] = await this.database.db
      .insert(reportJobs)
      .values({
        tenantId: command.tenantId,
        tenantName: command.tenantName,
        requestedByUserId: command.requestedByUserId,
        requestedByRole: command.requestedByRole,
        type: command.type,
        period: command.period,
        downloadFilename: command.downloadFilename,
      })
      .returning();

    if (row === undefined) {
      throw new Error("No fue posible crear la tarea de reporte.");
    }

    return this.toRecord(row);
  }

  async findJobById(reportId: string): Promise<ReportJobRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(reportJobs)
      .where(eq(reportJobs.id, reportId))
      .limit(1);

    return row === undefined ? null : this.toRecord(row);
  }

  async findExpiredReadyJobs(now: Date): Promise<ReportJobRecord[]> {
    const rows = await this.database.db
      .select()
      .from(reportJobs)
      .where(and(eq(reportJobs.status, "ready"), lt(reportJobs.expiresAt, now)))
      .orderBy(desc(reportJobs.expiresAt));

    return rows.map((row) => this.toRecord(row));
  }

  async listJobs(
    filters: ReportListFilters & { scopeTenantId: string | null },
  ): Promise<ReportJobRecord[]> {
    const conditions: SQL[] = [];

    if (filters.scopeTenantId !== null) {
      conditions.push(eq(reportJobs.tenantId, filters.scopeTenantId));
    } else if (filters.tenantId !== null) {
      conditions.push(eq(reportJobs.tenantId, filters.tenantId));
    }

    if (filters.type !== null) {
      conditions.push(eq(reportJobs.type, filters.type));
    }

    if (filters.period !== null) {
      conditions.push(eq(reportJobs.period, filters.period));
    }

    const rows = await this.database.db
      .select()
      .from(reportJobs)
      .where(conditions.length === 0 ? undefined : and(...conditions))
      .orderBy(desc(reportJobs.createdAt))
      .limit(25);

    return rows.map((row) => this.toRecord(row));
  }

  async markProcessing(reportId: string, startedAt: Date): Promise<ReportJobRecord | null> {
    const current = await this.findJobById(reportId);

    if (current === null || current.status !== "pending") {
      return current;
    }

    assertReportStatusTransition(current.status, "processing");

    const [row] = await this.database.db
      .update(reportJobs)
      .set({ status: "processing", startedAt, updatedAt: startedAt })
      .where(eq(reportJobs.id, reportId))
      .returning();

    return row === undefined ? null : this.toRecord(row);
  }

  async updateProgress(
    reportId: string,
    processedDocuments: number,
    failedDocuments: number,
  ): Promise<void> {
    await this.database.db
      .update(reportJobs)
      .set({ processedDocuments, failedDocuments, updatedAt: new Date() })
      .where(eq(reportJobs.id, reportId));
  }

  async markFinished(command: {
    reportId: string;
    status: "ready" | "empty";
    totalDocuments: number;
    processedDocuments: number;
    failedDocuments: number;
    storageKey: string | null;
    expiresAt: Date | null;
    completedAt: Date;
  }): Promise<ReportJobRecord | null> {
    const current = await this.findJobById(command.reportId);

    if (current === null) {
      return null;
    }

    assertReportStatusTransition(current.status, command.status);

    const [row] = await this.database.db
      .update(reportJobs)
      .set({
        status: command.status,
        totalDocuments: command.totalDocuments,
        processedDocuments: command.processedDocuments,
        failedDocuments: command.failedDocuments,
        storageKey: command.storageKey,
        expiresAt: command.expiresAt,
        completedAt: command.completedAt,
        updatedAt: command.completedAt,
      })
      .where(eq(reportJobs.id, command.reportId))
      .returning();

    return row === undefined ? null : this.toRecord(row);
  }

  async markFailed(reportId: string, errorCode: string, completedAt: Date): Promise<void> {
    const current = await this.findJobById(reportId);

    if (current === null || current.status === "failed") {
      return;
    }

    assertReportStatusTransition(current.status, "failed");
    await this.database.db
      .update(reportJobs)
      .set({ status: "failed", errorCode, completedAt, updatedAt: completedAt })
      .where(eq(reportJobs.id, reportId));
  }

  async cancel(reportId: string, completedAt: Date): Promise<ReportJobRecord | null> {
    const current = await this.findJobById(reportId);

    if (current === null || (current.status !== "pending" && current.status !== "processing")) {
      return current;
    }

    assertReportStatusTransition(current.status, "cancelled");

    const [row] = await this.database.db
      .update(reportJobs)
      .set({ status: "cancelled", completedAt, updatedAt: completedAt })
      .where(eq(reportJobs.id, reportId))
      .returning();

    return row === undefined ? null : this.toRecord(row);
  }

  async expireReadyJobs(now: Date): Promise<void> {
    await this.database.db
      .update(reportJobs)
      .set({ status: "expired", updatedAt: now })
      .where(and(eq(reportJobs.status, "ready"), lt(reportJobs.expiresAt, now)));
  }

  async createAudit(command: {
    actorUserId: string;
    targetTenantId: string;
    action: string;
    summary: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    await this.database.db.insert(auditLogs).values({
      actorUserId: command.actorUserId,
      targetTenantId: command.targetTenantId,
      action: command.action,
      summary: command.summary,
      metadata: command.metadata,
    });
  }

  private toRecord(row: typeof reportJobs.$inferSelect): ReportJobRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      requestedByUserId: row.requestedByUserId,
      requestedByRole: row.requestedByRole,
      type: row.type,
      period: row.period,
      status: row.status,
      totalDocuments: row.totalDocuments,
      processedDocuments: row.processedDocuments,
      failedDocuments: row.failedDocuments,
      storageKey: row.storageKey,
      downloadFilename: row.downloadFilename,
      errorCode: row.errorCode,
      expiresAt: row.expiresAt,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
