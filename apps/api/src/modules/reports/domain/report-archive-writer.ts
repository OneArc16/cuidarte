export const REPORT_ARCHIVE_WRITER = Symbol("REPORT_ARCHIVE_WRITER");

export type ReportArchiveEntry = {
  filename: string;
  buffer: Buffer;
};

export type ReportArchiveWriter = {
  writeZip(entries: AsyncIterable<ReportArchiveEntry>, destinationPath: string): Promise<number>;
};
