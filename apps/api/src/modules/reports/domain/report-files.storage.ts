export const REPORT_FILES_STORAGE = Symbol("REPORT_FILES_STORAGE");

export type StoredReportFile = {
  storageKey: string;
  absolutePath: string;
  sizeBytes: number;
};

export type ReadReportFile = {
  absolutePath: string;
  sizeBytes: number;
};

export type ReportFilesStorage = {
  reserve(
    reportId: string,
  ): Promise<{ storageKey: string; absolutePath: string; temporaryPath: string }>;
  commit(
    temporaryPath: string,
    absolutePath: string,
    storageKey: string,
  ): Promise<StoredReportFile>;
  read(storageKey: string): Promise<ReadReportFile>;
  delete(storageKey: string): Promise<void>;
  deleteTemporaryFiles(reportId: string): Promise<number>;
};
