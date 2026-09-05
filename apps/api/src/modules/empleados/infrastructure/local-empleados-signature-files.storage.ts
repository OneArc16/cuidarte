import { Injectable } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getEnv } from "../../../config/env";
import {
  EmpleadoSignatureStoredFileNotFoundError,
  type EmpleadosSignatureFilesStorage,
  type ReadStoredEmpleadoSignatureFile,
  type StoredEmpleadoSignatureUpload,
} from "../domain/empleados-signature-files.storage";
import { type BufferedEmpleadoSignatureUpload } from "../domain/empleado.types";

const LEGACY_SIGNATURES_DIRECTORY = "/tmp/cuidarte/empleados-signatures";
const API_ROOT_DIR = path.resolve(__dirname, "../../../..");

@Injectable()
export class LocalEmpleadosSignatureFilesStorage implements EmpleadosSignatureFilesStorage {
  private readonly baseDir = resolvePrimaryBaseDir(getEnv().EMPLEADOS_SIGNATURES_DIR);
  private readonly readBaseDirs = resolveReadBaseDirs(getEnv().EMPLEADOS_SIGNATURES_DIR);

  async saveFile(
    employee: { tenantId: string; employeeId: string },
    file: BufferedEmpleadoSignatureUpload,
  ): Promise<StoredEmpleadoSignatureUpload> {
    const extension = resolveFileExtension(file.originalName, file.mimeType);
    const relativeDirectory = path.posix.join(employee.tenantId, employee.employeeId, "signatures");
    const relativePath = path.posix.join(relativeDirectory, `${randomUUID()}${extension}`);
    const absolutePath = this.resolveStoredPath(this.baseDir, relativePath);

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
    let missingFileError: NodeJS.ErrnoException | null = null;

    for (const baseDir of this.readBaseDirs) {
      try {
        const buffer = await readFile(this.resolveStoredPath(baseDir, relativePath));

        if (baseDir !== this.baseDir) {
          await this.persistLegacyFileBestEffort(relativePath, buffer);
        }

        return {
          buffer,
          contentType,
          originalName,
        };
      } catch (error) {
        if (isMissingFileError(error)) {
          missingFileError = error;
          continue;
        }

        throw error;
      }
    }

    if (missingFileError !== null) {
      throw new EmpleadoSignatureStoredFileNotFoundError();
    }

    throw new Error("No fue posible leer la firma almacenada.");
  }

  private async persistLegacyFileBestEffort(relativePath: string, buffer: Buffer): Promise<void> {
    const primaryPath = this.resolveStoredPath(this.baseDir, relativePath);

    try {
      await mkdir(path.dirname(primaryPath), { recursive: true });
      await writeFile(primaryPath, buffer, { flag: "wx" });
    } catch (error) {
      if (isExistingFileError(error)) {
        return;
      }
    }
  }

  private resolveStoredPath(baseDir: string, relativePath: string): string {
    const safeRelativePath = relativePath.replace(/\\/g, "/");
    const resolvedPath = path.resolve(baseDir, safeRelativePath);
    const basePathWithSeparator = `${baseDir}${path.sep}`;

    if (resolvedPath !== baseDir && !resolvedPath.startsWith(basePathWithSeparator)) {
      throw new Error("La ruta del archivo es invalida.");
    }

    return resolvedPath;
  }
}

export function resolveReadBaseDirs(
  configuredDirectory: string,
  currentWorkingDirectory: string = process.cwd(),
): string[] {
  const primaryBaseDir = resolvePrimaryBaseDir(configuredDirectory);
  const currentWorkingDirectoryBaseDir = resolveBaseDirFromCwd(
    configuredDirectory,
    currentWorkingDirectory,
  );

  return Array.from(
    new Set([
      primaryBaseDir,
      currentWorkingDirectoryBaseDir,
      path.resolve(LEGACY_SIGNATURES_DIRECTORY),
    ]),
  );
}

function resolvePrimaryBaseDir(configuredDirectory: string): string {
  if (path.isAbsolute(configuredDirectory)) {
    return path.resolve(configuredDirectory);
  }

  return path.resolve(API_ROOT_DIR, configuredDirectory);
}

function resolveBaseDirFromCwd(configuredDirectory: string, currentWorkingDirectory: string): string {
  if (path.isAbsolute(configuredDirectory)) {
    return path.resolve(configuredDirectory);
  }

  return path.resolve(currentWorkingDirectory, configuredDirectory);
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function isExistingFileError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
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
