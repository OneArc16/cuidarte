export const ADULTOS_MAYORES_FILES_STORAGE = Symbol("ADULTOS_MAYORES_FILES_STORAGE");

export type AdultoMayorPdfUpload = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

export type StoredAdultoMayorPdf = {
  originalName: string;
  mimeType: "application/pdf";
  sizeBytes: number;
  relativePath: string;
};

export type AdultosMayoresFilesStorage = {
  savePdf(adultoMayorId: string, file: AdultoMayorPdfUpload): Promise<StoredAdultoMayorPdf>;
  readFile(relativePath: string): Promise<Buffer>;
  deleteFile(relativePath: string): Promise<void>;
};
