import { type ReportStatus } from "@cuidarte/contracts";

import {
  type CreateReportJobCommand,
  type ReportJobRecord,
  type ReportListFilters,
} from "./report.types";

export const REPORTS_REPOSITORY = Symbol("REPORTS_REPOSITORY");

export type ReportsRepository = {
  findTenantById(tenantId: string): Promise<{ id: string; name: string } | null>;
  findActiveDuplicate(command: {
    tenantId: string;
    type: CreateReportJobCommand["type"];
    period: string;
  }): Promise<ReportJobRecord | null>;
  createJob(command: CreateReportJobCommand): Promise<ReportJobRecord>;
  findJobById(reportId: string): Promise<ReportJobRecord | null>;
  findExpiredReadyJobs(now: Date): Promise<ReportJobRecord[]>;
  listJobs(
    filters: ReportListFilters & { scopeTenantId: string | null },
  ): Promise<ReportJobRecord[]>;
  markProcessing(reportId: string, startedAt: Date): Promise<ReportJobRecord | null>;
  updateProgress(
    reportId: string,
    processedDocuments: number,
    failedDocuments: number,
  ): Promise<void>;
  markFinished(command: {
    reportId: string;
    status: Extract<ReportStatus, "ready" | "empty">;
    totalDocuments: number;
    processedDocuments: number;
    failedDocuments: number;
    storageKey: string | null;
    expiresAt: Date | null;
    completedAt: Date;
  }): Promise<ReportJobRecord | null>;
  markFailed(reportId: string, errorCode: string, completedAt: Date): Promise<void>;
  cancel(reportId: string, completedAt: Date): Promise<ReportJobRecord | null>;
  expireReadyJobs(now: Date): Promise<void>;
  createAudit(command: {
    actorUserId: string;
    targetTenantId: string;
    action: string;
    summary: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
};
