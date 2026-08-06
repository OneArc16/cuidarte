import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { getEnv } from "../../../config/env";
import {
  type AtencionesIndividualesFilesStorage,
  AtencionIndividualStoredFileNotFoundError,
  type ReadAtencionIndividualStoredFile,
} from "../domain/atenciones-individuales-files.storage";
import {
  type BufferedAtencionIndividualUpload,
  type PersistAtencionIndividualSupportFile,
} from "../domain/atencion-individual.types";

@Injectable()
export class LocalAtencionesIndividualesFilesStorage implements AtencionesIndividualesFilesStorage {
  private baseDir = path.resolve(getEnv().DOCUMENTS_UPLOADS_DIR);

  static forBaseDir(baseDir: string): LocalAtencionesIndividualesFilesStorage {
    const storage = new LocalAtencionesIndividualesFilesStorage();
    storage.baseDir = path.resolve(baseDir);

    return storage;
  }

  async saveFile(
    atencion: { tenantId: string; atencionId: string },
    file: BufferedAtencionIndividualUpload,
  ): Promise<PersistAtencionIndividualSupportFile> {
    const storedName = `${randomUUID()}.pdf`;
    const relativeDirectory = path.posix.join(
      atencion.tenantId,
      "atenciones-individuales",
      atencion.atencionId,
    );
    const relativePath = path.posix.join(relativeDirectory, storedName);
    const absolutePath = this.resolveStoredPath(relativePath);
    const temporaryPath = `${absolutePath}.${randomUUID()}.part`;

    await mkdir(path.dirname(absolutePath), { recursive: true, mode: 0o750 });

    try {
      await writeFile(temporaryPath, file.buffer, { flag: "wx", mode: 0o640 });
      await rename(temporaryPath, absolutePath);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }

    return {
      originalName: file.originalName,
      storedName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      checksum: createHash("sha256").update(file.buffer).digest("hex"),
      relativePath,
    };
  }

  async readFile(
    relativePath: string,
    originalName: string,
    _contentType: string,
  ): Promise<ReadAtencionIndividualStoredFile> {
    let buffer: Buffer;

    try {
      buffer = await readFile(this.resolveStoredPath(relativePath));
    } catch (error) {
      if (isFileNotFoundError(error)) {
        throw new AtencionIndividualStoredFileNotFoundError();
      }

      throw error;
    }

    return {
      buffer,
      contentType: "application/pdf",
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
