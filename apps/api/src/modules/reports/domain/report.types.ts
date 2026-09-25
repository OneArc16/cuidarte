import {
  type AuthUser,
  type ReportActivityFilters,
  type ReportStatus,
  type ReportType,
} from "@cuidarte/contracts";

export type ReportScope = {
  tenantId: string;
  tenantName: string;
};

export type ReportAvailability = ReportScope & {
  type: ReportType;
  period: string;
  availableDocuments: number;
  generatedDocuments?: number;
  importedDocuments?: number;
};

export type ReportJobRecord = {
  filterKey: string;
  activityFilters: {
    search: string | null;
    activityTypeId: string | null;
    organizer: ReportActivityFilters["organizer"] | null;
  };
  id: string;
  tenantId: string;
  tenantName: string;
  requestedByUserId: string;
  requestedByRole: AuthUser["role"];
  type: ReportType;
  period: string;
  status: ReportStatus;
  totalDocuments: number | null;
  processedDocuments: number;
  failedDocuments: number;
  storageKey: string | null;
  downloadFilename: string | null;
  errorCode: string | null;
  expiresAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateReportJobCommand = {
  tenantId: string;
  tenantName: string;
  requestedByUserId: string;
  requestedByRole: AuthUser["role"];
  type: ReportType;
  period: string;
  filterKey: string;
  activityFilters: ReportJobRecord["activityFilters"];
  totalDocuments: number;
  downloadFilename: string;
};

export type ReportListFilters = {
  type: ReportType | null;
  period: string | null;
  tenantId: string | null;
};

export type ReportDocument = {
  filename: string;
  buffer: Buffer;
  contentType: "application/pdf";
};

export type ReportSource = {
  count(
    scope: ReportScope,
    period: string,
    filters?: ReportJobRecord["activityFilters"],
  ): Promise<ReportAvailability>;
  documents(
    scope: ReportScope,
    period: string,
    actor: AuthUser,
    filters?: ReportJobRecord["activityFilters"],
  ): AsyncIterable<ReportDocument>;
};
