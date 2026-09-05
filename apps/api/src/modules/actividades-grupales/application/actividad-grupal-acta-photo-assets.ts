import { InternalServerErrorException } from "@nestjs/common";
import sharp from "sharp";

import {
  type ActividadGrupalSupportFileRecord,
} from "../domain/actividad-grupal.types";
import {
  type ActividadesGrupalesFilesStorage,
} from "../domain/actividades-grupales-files.storage";

export type PreparedActividadGrupalActaPhotoAsset = {
  id: string;
  originalName: string;
  dataUrl: string;
};

const MAX_SOURCE_PIXELS = 36_000_000;
const OUTPUT_MAX_DIMENSION = 1_600;
const JPEG_QUALITY = 82;

export async function prepareActividadGrupalActaPhotoAssets(
  photoFiles: ActividadGrupalSupportFileRecord[],
  filesStorage: ActividadesGrupalesFilesStorage,
): Promise<PreparedActividadGrupalActaPhotoAsset[]> {
  const orderedPhotoFiles = [...photoFiles].sort((left, right) => {
    const byCreatedAt = left.createdAt.getTime() - right.createdAt.getTime();

    return byCreatedAt !== 0 ? byCreatedAt : left.id.localeCompare(right.id);
  });

  return Promise.all(
    orderedPhotoFiles.map(async (photoFile) => {
      try {
        const storedPhoto = await filesStorage.readFile(
          photoFile.relativePath,
          photoFile.originalName,
          photoFile.mimeType,
        );
        const normalizedPhoto = await sharp(storedPhoto.buffer, {
          failOn: "error",
          limitInputPixels: MAX_SOURCE_PIXELS,
        })
          .rotate()
          .resize({
            width: OUTPUT_MAX_DIMENSION,
            height: OUTPUT_MAX_DIMENSION,
            fit: "inside",
            withoutEnlargement: true,
          })
          .flatten({ background: "#ffffff" })
          .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
          .toBuffer();

        return {
          id: photoFile.id,
          originalName: photoFile.originalName,
          dataUrl: `data:image/jpeg;base64,${normalizedPhoto.toString("base64")}`,
        };
      } catch (error) {
        if (error instanceof InternalServerErrorException) {
          throw error;
        }

        throw new InternalServerErrorException(
          `No fue posible preparar la foto "${photoFile.originalName}" del acta.`,
          { cause: error },
        );
      }
    }),
  );
}
