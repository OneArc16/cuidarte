import { type BufferedEmpleadoSignatureUpload } from "./empleado.types";

export const EMPLEADOS_SIGNATURE_FILES_STORAGE = Symbol("EMPLEADOS_SIGNATURE_FILES_STORAGE");

export class EmpleadoSignatureStoredFileNotFoundError extends Error {
  constructor() {
    super("No fue posible encontrar el archivo de firma almacenado.");
    this.name = "EmpleadoSignatureStoredFileNotFoundError";
  }
}

export type StoredEmpleadoSignatureUpload = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
};

export type ReadStoredEmpleadoSignatureFile = {
  buffer: Buffer;
  contentType: string;
  originalName: string;
};

export type EmpleadosSignatureFilesStorage = {
  saveFile(
    employee: { tenantId: string; employeeId: string },
    file: BufferedEmpleadoSignatureUpload,
  ): Promise<StoredEmpleadoSignatureUpload>;
  readFile(
    relativePath: string,
    originalName: string,
    contentType: string,
  ): Promise<ReadStoredEmpleadoSignatureFile>;
};
