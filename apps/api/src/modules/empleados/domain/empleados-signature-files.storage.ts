import { type BufferedEmpleadoSignatureUpload } from "./empleado.types";

export const EMPLEADOS_SIGNATURE_FILES_STORAGE = Symbol("EMPLEADOS_SIGNATURE_FILES_STORAGE");

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
