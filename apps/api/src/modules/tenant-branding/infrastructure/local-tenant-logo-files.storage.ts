import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { getEnv } from "../../../config/env";
import {
  type ReadTenantLogoFile,
  type StoredTenantLogoFile,
  type TenantLogoFilesStorage,
} from "../domain/tenant-logo-files.storage";

@Injectable()
export class LocalTenantLogoFilesStorage implements TenantLogoFilesStorage {
  private readonly baseDir = path.resolve(getEnv().TENANT_ASSETS_DIR);

  async saveFile(
    scope: { tenantId: string },
    file: { buffer: Buffer },
  ): Promise<StoredTenantLogoFile> {
    const relativePath = path.posix.join(
      scope.tenantId,
      "branding",
      "logos",
      `${randomUUID()}.png`,
    );
    const absolutePath = this.resolveStoredPath(relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer, { flag: "wx" });

    return { relativePath };
  }

  async readFile(relativePath: string): Promise<ReadTenantLogoFile> {
    return {
      buffer: await readFile(this.resolveStoredPath(relativePath)),
      contentType: "image/png",
    };
  }

  async deleteFile(relativePath: string): Promise<void> {
    try {
      await unlink(this.resolveStoredPath(relativePath));
    } catch (error) {
      if (isFileNotFoundError(error)) {
        return;
      }

      throw error;
    }
  }

  private resolveStoredPath(relativePath: string): string {
    const safeRelativePath = relativePath.replace(/\\/g, "/");
    const resolvedPath = path.resolve(this.baseDir, safeRelativePath);
    const basePathWithSeparator = `${this.baseDir}${path.sep}`;

    if (resolvedPath === this.baseDir || !resolvedPath.startsWith(basePathWithSeparator)) {
      throw new Error("La ruta del archivo de logo es invalida.");
    }

    return resolvedPath;
  }
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
