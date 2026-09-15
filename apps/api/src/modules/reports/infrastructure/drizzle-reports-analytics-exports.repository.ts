import { Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import { reportAnalyticsExports } from "../../../database/schema";
import { type ReportsAnalyticsExportRecord, type ReportsAnalyticsExportsRepository } from "../domain/reports-analytics-export.types";

@Injectable()
export class DrizzleReportsAnalyticsExportsRepository implements ReportsAnalyticsExportsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(command: Parameters<ReportsAnalyticsExportsRepository["create"]>[0]): Promise<ReportsAnalyticsExportRecord> {
    const [row] = await this.database.db.insert(reportAnalyticsExports).values(command).returning();
    if (!row) throw new Error("No fue posible crear la exportacion analitica.");
    return this.toRecord(row);
  }

  async findById(id: string) { const [row] = await this.database.db.select().from(reportAnalyticsExports).where(eq(reportAnalyticsExports.id, id)).limit(1); return row ? this.toRecord(row) : null; }
  async list() { const rows = await this.database.db.select().from(reportAnalyticsExports).orderBy(desc(reportAnalyticsExports.createdAt)).limit(100); return rows.map((row) => this.toRecord(row)); }
  async markProcessing(id: string, startedAt: Date) { const [row] = await this.database.db.update(reportAnalyticsExports).set({ status: "processing", progress: 1, startedAt, updatedAt: new Date() }).where(eq(reportAnalyticsExports.id, id)).returning(); return row ? this.toRecord(row) : null; }
  async updateProgress(id: string, progress: number) { await this.database.db.update(reportAnalyticsExports).set({ progress, updatedAt: new Date() }).where(eq(reportAnalyticsExports.id, id)); }
  async markReady(id: string, storageKey: string, expiresAt: Date, completedAt: Date) { const [row] = await this.database.db.update(reportAnalyticsExports).set({ status: "ready", progress: 100, storageKey, expiresAt, completedAt, updatedAt: new Date() }).where(and(eq(reportAnalyticsExports.id, id), eq(reportAnalyticsExports.status, "processing"))).returning(); return row ? this.toRecord(row) : null; }
  async markFailed(id: string, errorMessage: string) { await this.database.db.update(reportAnalyticsExports).set({ status: "failed", errorMessage, updatedAt: new Date() }).where(eq(reportAnalyticsExports.id, id)); }
  async cancel(id: string) { const [row] = await this.database.db.update(reportAnalyticsExports).set({ status: "cancelled", updatedAt: new Date() }).where(eq(reportAnalyticsExports.id, id)).returning(); return row ? this.toRecord(row) : null; }

  private toRecord(row: typeof reportAnalyticsExports.$inferSelect): ReportsAnalyticsExportRecord {
    return { ...row, from: row.from, to: row.to, errorMessage: row.errorMessage };
  }
}
