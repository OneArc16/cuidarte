import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { getEnv } from "../../../config/env";
import {
  type AtencionesIndividualesFilesStorage,
  type ReadAtencionIndividualStoredFile,
} from "../domain/atenciones-individuales-files.storage";
import {
  type BufferedAtencionIndividualUpload,
  type PersistAtencionIndividualSupportFile,
} from "../domain/atencion-individual.types";

@Injectable()
export class LocalAtencionesIndividualesFilesStorage implements AtencionesIndividualesFilesStorage {
  private readonly baseDir = path.resolve(getEnv().ATENCIONES_INDIVIDUALES_UPLOADS_DIR);

  async saveFile(
    atencion: { tenantId: string; atencionId: string },
    file: BufferedAtencionIndividualUpload,
  ): Promise<PersistAtencionIndividualSupportFile> {
    const extension = path.extname(file.originalName).trim().toLowerCase();
    const relativeDirectory = path.posix.join(atencion.tenantId, atencion.atencionId, "soportes");
    const relativePath = path.posix.join(relativeDirectory, `${randomUUID()}${extension}`);
    const absolutePath = this.resolveStoredPath(relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
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
  ): Promise<ReadAtencionIndividualStoredFile> {
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

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
