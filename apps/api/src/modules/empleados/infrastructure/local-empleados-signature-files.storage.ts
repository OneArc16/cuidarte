import { Injectable } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getEnv } from "../../../config/env";
import {
  type EmpleadosSignatureFilesStorage,
  type ReadStoredEmpleadoSignatureFile,
  type StoredEmpleadoSignatureUpload,
} from "../domain/empleados-signature-files.storage";
import { type BufferedEmpleadoSignatureUpload } from "../domain/empleado.types";

@Injectable()
export class LocalEmpleadosSignatureFilesStorage implements EmpleadosSignatureFilesStorage {
  private readonly baseDir = path.resolve(getEnv().EMPLEADOS_SIGNATURES_DIR);

  async saveFile(
    employee: { tenantId: string; employeeId: string },
    file: BufferedEmpleadoSignatureUpload,
  ): Promise<StoredEmpleadoSignatureUpload> {
    const extension = resolveFileExtension(file.originalName, file.mimeType);
    const relativeDirectory = path.posix.join(employee.tenantId, employee.employeeId, "signatures");
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
  ): Promise<ReadStoredEmpleadoSignatureFile> {
    const buffer = await readFile(this.resolveStoredPath(relativePath));

    return {
      buffer,
      contentType,
      originalName,
    };
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
    case "image/jpg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}
