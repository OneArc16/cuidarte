import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { getEnv } from "../../../config/env";
import {
  AlimentacionFormatoStoredFileNotFoundError,
  type AlimentacionFormatoFilesStorage,
  type ReadStoredAlimentacionFormatoFile,
  type StoredAlimentacionFormatoFile,
} from "../domain/alimentacion-formato-files.storage";

@Injectable()
export class LocalAlimentacionFormatoFilesStorage implements AlimentacionFormatoFilesStorage {
  private readonly baseDir = path.resolve(getEnv().ALIMENTACION_FORMATOS_DIR);

  async saveFile(
    scope: { tenantId: string; adultoMayorId: string; deliveryMonth: string },
    file: { filename: string; contentType: string; buffer: Buffer },
  ): Promise<StoredAlimentacionFormatoFile> {
    const extension = resolveFileExtension(file.filename, file.contentType);
    const relativeDirectory = path.posix.join(
      scope.tenantId,
      scope.adultoMayorId,
      scope.deliveryMonth,
    );
    const storedName = `${randomUUID()}${extension}`;
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
      filename: file.filename,
      storedName,
      contentType: file.contentType,
      relativePath,
    };
  }

  async readFile(
    relativePath: string,
    filename: string,
    contentType: string,
  ): Promise<ReadStoredAlimentacionFormatoFile> {
    let buffer: Buffer;

    try {
      buffer = await readFile(this.resolveStoredPath(relativePath));
    } catch (error) {
      if (isFileNotFoundError(error)) {
        throw new AlimentacionFormatoStoredFileNotFoundError();
      }

      throw error;
    }

    return {
      buffer,
      contentType,
      filename,
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

  async saveStagedFile(
    batchId: string,
    itemId: string,
    file: { filename: string; contentType: string; buffer: Buffer },
  ): Promise<StoredAlimentacionFormatoFile> {
    const storedName = `${itemId}.pdf`;
    const relativePath = path.posix.join("_staging", batchId, storedName);
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
    return { filename: file.filename, storedName, contentType: file.contentType, relativePath };
  }

  async readStagedFile(relativePath: string, filename: string) {
    return this.readFile(relativePath, filename, "application/pdf");
  }

  async deleteStagedFile(relativePath: string): Promise<void> {
    return this.deleteFile(relativePath);
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

function resolveFileExtension(filename: string, contentType: string): string {
  const currentExtension = path.extname(filename).trim().toLowerCase();

  if (currentExtension !== "") {
    return currentExtension;
  }

  return contentType === "application/pdf" ? ".pdf" : "";
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
