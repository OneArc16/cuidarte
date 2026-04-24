import { Injectable } from "@nestjs/common";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getEnv } from "../../../config/env";
import {
  type ActividadesGrupalesFilesStorage,
  type ReadActividadGrupalStoredFile,
  type StoredActividadGrupalUpload,
} from "../domain/actividades-grupales-files.storage";
import { type BufferedActividadGrupalUpload } from "../domain/actividad-grupal.types";

@Injectable()
export class LocalActividadesGrupalesFilesStorage implements ActividadesGrupalesFilesStorage {
  private readonly baseDir = path.resolve(getEnv().ACTIVIDADES_GRUPALES_UPLOADS_DIR);

  async saveFile(
    activity: { tenantId: string; activityId: string },
    kind: StoredActividadGrupalUpload["kind"],
    file: BufferedActividadGrupalUpload,
  ): Promise<StoredActividadGrupalUpload> {
    const extension = resolveFileExtension(file.originalName, file.mimeType);
    const relativeDirectory = path.posix.join(
      activity.tenantId,
      activity.activityId,
      kind === "support_photo" ? "photos" : "pdf",
    );
    const relativePath = path.posix.join(relativeDirectory, `${randomUUID()}${extension}`);
    const absolutePath = this.resolveStoredPath(relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
      kind,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      relativePath,
    };
  }

  async readFile(
    relativePath: string,
    originalName: string,
    contentType: string,
  ): Promise<ReadActividadGrupalStoredFile> {
    const buffer = await readFile(this.resolveStoredPath(relativePath));

    return {
      buffer,
      contentType,
      originalName,
    };
  }

  async deleteFile(relativePath: string): Promise<void> {
    try {
      await unlink(this.resolveStoredPath(relativePath));
    } catch (error) {
      if (!isFileNotFoundError(error)) {
        throw error;
      }
    }
  }

  private resolveStoredPath(relativePath: string): string {
    const safeRelativePath = relativePath.replace(/\\/g, "/");
    const resolvedPath = path.resolve(this.baseDir, safeRelativePath);
    const basePathWithSeparator = `${this.baseDir}${path.sep}`;

    if (resolvedPath !== this.baseDir && !resolvedPath.startsWith(basePathWithSeparator)) {
      throw new Error("La ruta del archivo es invalida.");
    }

    return resolvedPath;
  }
}

function resolveFileExtension(originalName: string, mimeType: string): string {
  const originalExtension = path.extname(originalName).trim();

  if (originalExtension !== "") {
    return originalExtension.toLowerCase();
  }

  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "application/pdf":
      return ".pdf";
    default:
      return "";
  }
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
