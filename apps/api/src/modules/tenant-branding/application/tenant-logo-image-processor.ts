import { createHash } from "node:crypto";
import path from "node:path";

import { BadRequestException, Injectable } from "@nestjs/common";
import sharp from "sharp";

import {
  type BufferedTenantLogoUpload,
  type ProcessedTenantLogo,
} from "../domain/tenant-branding.types";

export const MAX_TENANT_LOGO_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const MIN_DIMENSION = 32;
const MAX_DIMENSION = 4_000;
const OUTPUT_MAX_WIDTH = 1_200;
const OUTPUT_MAX_HEIGHT = 600;
const ALLOWED_DECODED_FORMATS = new Set(["png", "jpeg", "webp"]);
const FORMAT_BY_EXTENSION: Record<string, "jpeg" | "png" | "webp"> = {
  ".jpeg": "jpeg",
  ".jpg": "jpeg",
  ".png": "png",
  ".webp": "webp",
};
const FORMAT_BY_MIME_TYPE: Record<string, "jpeg" | "png" | "webp"> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

@Injectable()
export class TenantLogoImageProcessor {
  async process(upload: BufferedTenantLogoUpload): Promise<ProcessedTenantLogo> {
    const declaredFormat = this.validateUploadEnvelope(upload);

    try {
      const image = sharp(upload.buffer, {
        animated: true,
        failOn: "error",
        limitInputPixels: MAX_DIMENSION * MAX_DIMENSION,
      });
      const metadata = await image.metadata();
      const width = metadata.width ?? 0;
      const height = metadata.height ?? 0;
      const pages = metadata.pages ?? 1;

      if (
        metadata.format === undefined ||
        !ALLOWED_DECODED_FORMATS.has(metadata.format) ||
        metadata.format !== declaredFormat ||
        width < MIN_DIMENSION ||
        height < MIN_DIMENSION ||
        width > MAX_DIMENSION ||
        height > MAX_DIMENSION ||
        pages !== 1
      ) {
        throw new BadRequestException(
          "El logo debe ser una imagen PNG, JPEG o WebP no animada, entre 32 x 32 y 4000 x 4000 px.",
        );
      }

      const normalized = await image
        .rotate()
        .resize({
          width: OUTPUT_MAX_WIDTH,
          height: OUTPUT_MAX_HEIGHT,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer({ resolveWithObject: true });

      return {
        buffer: normalized.data,
        mimeType: "image/png",
        sizeBytes: normalized.data.byteLength,
        checksum: createHash("sha256").update(normalized.data).digest("hex"),
        width: normalized.info.width,
        height: normalized.info.height,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        "No fue posible leer la imagen. Verifica que el archivo sea un PNG, JPEG o WebP valido.",
      );
    }
  }

  private validateUploadEnvelope(upload: BufferedTenantLogoUpload): "jpeg" | "png" | "webp" {
    if (upload.sizeBytes === 0 || upload.buffer.byteLength === 0) {
      throw new BadRequestException("La imagen del logo no puede estar vacia.");
    }

    if (
      upload.sizeBytes > MAX_TENANT_LOGO_FILE_SIZE_BYTES ||
      upload.buffer.byteLength > MAX_TENANT_LOGO_FILE_SIZE_BYTES
    ) {
      throw new BadRequestException("El logo no puede superar 2 MB.");
    }

    const extension = path.extname(upload.originalName).toLowerCase();
    const extensionFormat = FORMAT_BY_EXTENSION[extension];
    const mimeFormat = FORMAT_BY_MIME_TYPE[upload.mimeType];

    if (
      extensionFormat === undefined ||
      mimeFormat === undefined ||
      extensionFormat !== mimeFormat
    ) {
      throw new BadRequestException("El logo debe tener formato PNG, JPEG o WebP.");
    }

    return extensionFormat;
  }
}
