import { randomUUID } from "node:crypto";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { getEnv } from "../../../config/env";
import {
  type ReadReportFile,
  type ReportFilesStorage,
  type StoredReportFile,
} from "../domain/report-files.storage";

@Injectable()
export class LocalReportFilesStorage implements ReportFilesStorage {
  private readonly baseDir = path.resolve(getEnv().REPORTS_DIR);

  async reserve(reportId: string): Promise<{
    storageKey: string;
    absolutePath: string;
    temporaryPath: string;
  }> {
    const storageKey = path.posix.join(reportId, `${randomUUID()}.zip`);
    const absolutePath = this.resolveStoredPath(storageKey);
    const temporaryPath = `${absolutePath}.${randomUUID()}.part`;

    await mkdir(path.dirname(absolutePath), { recursive: true, mode: 0o750 });

    return { storageKey, absolutePath, temporaryPath };
  }

  async commit(
    temporaryPath: string,
    absolutePath: string,
    storageKey: string,
  ): Promise<StoredReportFile> {
    await rename(temporaryPath, absolutePath);
    const fileStat = await stat(absolutePath);

    return {
      storageKey,
      absolutePath,
      sizeBytes: fileStat.size,
    };
  }

  async read(storageKey: string): Promise<ReadReportFile> {
    const absolutePath = this.resolveStoredPath(storageKey);
    const fileStat = await stat(absolutePath);

    return {
      absolutePath,
      sizeBytes: fileStat.size,
    };
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await unlink(this.resolveStoredPath(storageKey));
    } catch (error) {
      if (!isFileNotFoundError(error)) {
        throw error;
      }
    }
  }

  private resolveStoredPath(storageKey: string): string {
    const safeStorageKey = storageKey.replace(/\\/g, "/");
    const resolvedPath = path.resolve(this.baseDir, safeStorageKey);
    const basePathWithSeparator = `${this.baseDir}${path.sep}`;

    if (resolvedPath !== this.baseDir && !resolvedPath.startsWith(basePathWithSeparator)) {
      throw new Error("La ruta del reporte es invalida.");
    }

    return resolvedPath;
  }
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
