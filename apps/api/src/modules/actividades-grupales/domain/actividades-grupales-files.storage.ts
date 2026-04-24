import { type ActividadGrupalSupportFileKind } from "@cuidarte/contracts";

import { type BufferedActividadGrupalUpload } from "./actividad-grupal.types";

export const ACTIVIDADES_GRUPALES_FILES_STORAGE = Symbol("ACTIVIDADES_GRUPALES_FILES_STORAGE");

export type StoredActividadGrupalUpload = {
  kind: ActividadGrupalSupportFileKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
};

export type ReadActividadGrupalStoredFile = {
  buffer: Buffer;
  contentType: string;
  originalName: string;
};

export type ActividadesGrupalesFilesStorage = {
  saveFile(
    activity: { tenantId: string; activityId: string },
    kind: ActividadGrupalSupportFileKind,
    file: BufferedActividadGrupalUpload,
  ): Promise<StoredActividadGrupalUpload>;
  readFile(
    relativePath: string,
    originalName: string,
    contentType: string,
  ): Promise<ReadActividadGrupalStoredFile>;
  deleteFile(relativePath: string): Promise<void>;
};
