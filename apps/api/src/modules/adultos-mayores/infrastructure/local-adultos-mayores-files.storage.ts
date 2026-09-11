import { Injectable } from "@nestjs/common";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getEnv } from "../../../config/env";
import {
  type AdultoMayorPdfUpload,
  type AdultosMayoresFilesStorage,
  type StoredAdultoMayorPdf,
} from "../domain/adultos-mayores-files.storage";

@Injectable()
export class LocalAdultosMayoresFilesStorage implements AdultosMayoresFilesStorage {
  private readonly baseDir = path.resolve(getEnv().DOCUMENTS_UPLOADS_DIR, "adultos-mayores");

  async savePdf(adultoMayorId: string, file: AdultoMayorPdfUpload): Promise<StoredAdultoMayorPdf> {
    const relativePath = path.posix.join(adultoMayorId, `${randomUUID()}.pdf`);
    const absolutePath = this.resolvePath(relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
      originalName: file.originalName,
      mimeType: "application/pdf",
      sizeBytes: file.sizeBytes,
      relativePath,
    };
  }

  readFile(relativePath: string): Promise<Buffer> {
    return readFile(this.resolvePath(relativePath));
  }

  async deleteFile(relativePath: string): Promise<void> {
    try {
      await unlink(this.resolvePath(relativePath));
    } catch (error) {
      if (!isNotFoundError(error)) throw error;
    }
  }

  private resolvePath(relativePath: string): string {
    const resolvedPath = path.resolve(this.baseDir, relativePath.replace(/\\/g, "/"));
    const basePath = `${this.baseDir}${path.sep}`;

    if (!resolvedPath.startsWith(basePath)) {
      throw new Error("La ruta del documento es invalida.");
    }

    return resolvedPath;
  }
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
