export const ALIMENTACION_FORMATO_FILES_STORAGE = Symbol("ALIMENTACION_FORMATO_FILES_STORAGE");

export type StoredAlimentacionFormatoFile = {
  filename: string;
  storedName: string;
  contentType: string;
  relativePath: string;
};

export type ReadStoredAlimentacionFormatoFile = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

export class AlimentacionFormatoStoredFileNotFoundError extends Error {
  constructor() {
    super("El archivo almacenado no existe.");
    this.name = "AlimentacionFormatoStoredFileNotFoundError";
  }
}

export type AlimentacionFormatoFilesStorage = {
  saveFile(
    scope: { tenantId: string; adultoMayorId: string; deliveryMonth: string },
    file: { filename: string; contentType: string; buffer: Buffer },
  ): Promise<StoredAlimentacionFormatoFile>;
  readFile(
    relativePath: string,
    filename: string,
    contentType: string,
  ): Promise<ReadStoredAlimentacionFormatoFile>;
  deleteFile(relativePath: string): Promise<void>;
};
