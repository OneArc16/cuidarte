import { type AuthUser, type ReportAnalyticsExportFormat, type ReportAnalyticsExportStatus } from "@cuidarte/contracts";

export type ReportsAnalyticsExportRecord = {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  requestedByUserId: string;
  requestedByRole: AuthUser["role"];
  format: ReportAnalyticsExportFormat;
  from: string;
  to: string;
  status: ReportAnalyticsExportStatus;
  progress: number;
  storageKey: string | null;
  downloadFilename: string | null;
  errorMessage: string | null;
  expiresAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const REPORTS_ANALYTICS_EXPORTS_REPOSITORY = Symbol("REPORTS_ANALYTICS_EXPORTS_REPOSITORY");
export type ReportsAnalyticsExportsRepository = {
  create(command: Pick<ReportsAnalyticsExportRecord, "tenantId" | "tenantName" | "requestedByUserId" | "requestedByRole" | "format" | "from" | "to" | "downloadFilename">): Promise<ReportsAnalyticsExportRecord>;
  findById(id: string): Promise<ReportsAnalyticsExportRecord | null>;
  list(): Promise<ReportsAnalyticsExportRecord[]>;
  markProcessing(id: string, startedAt: Date): Promise<ReportsAnalyticsExportRecord | null>;
  updateProgress(id: string, progress: number): Promise<void>;
  markReady(id: string, storageKey: string, expiresAt: Date, completedAt: Date): Promise<ReportsAnalyticsExportRecord | null>;
  markFailed(id: string, errorMessage: string): Promise<void>;
  cancel(id: string): Promise<ReportsAnalyticsExportRecord | null>;
};
