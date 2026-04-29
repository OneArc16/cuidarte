import {
  type BufferedAtencionIndividualUpload,
  type PersistAtencionIndividualSupportFile,
} from "./atencion-individual.types";

export const ATENCIONES_INDIVIDUALES_FILES_STORAGE = Symbol(
  "ATENCIONES_INDIVIDUALES_FILES_STORAGE",
);

export type ReadAtencionIndividualStoredFile = {
  buffer: Buffer;
  contentType: string;
  originalName: string;
};

export type AtencionesIndividualesFilesStorage = {
  saveFile(
    atencion: { tenantId: string; atencionId: string },
    file: BufferedAtencionIndividualUpload,
  ): Promise<PersistAtencionIndividualSupportFile>;
  readFile(
    relativePath: string,
    originalName: string,
    contentType: string,
  ): Promise<ReadAtencionIndividualStoredFile>;
  deleteFile(relativePath: string): Promise<void>;
};
