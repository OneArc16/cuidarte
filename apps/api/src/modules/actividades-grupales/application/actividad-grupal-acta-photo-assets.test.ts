import assert from "node:assert/strict";
import { describe, it } from "node:test";

import sharp from "sharp";

import { prepareActividadGrupalActaPhotoAssets } from "./actividad-grupal-acta-photo-assets";
import { type ActividadGrupalSupportFileRecord } from "../domain/actividad-grupal.types";
import { type ActividadesGrupalesFilesStorage } from "../domain/actividades-grupales-files.storage";

describe("prepareActividadGrupalActaPhotoAssets", () => {
  it("sorts by createdAt and id, then normalizes each photo to jpeg data urls", async () => {
    const sourceBuffer = await sharp({
      create: {
        width: 2_400,
        height: 1_800,
        channels: 4,
        background: "#2e7d67",
      },
    })
      .png()
      .toBuffer();
    const storage = createStorage(sourceBuffer);
    const photoFiles = [
      createPhotoFile("photo-c", "2026-04-23T12:00:00.000Z", "c.png"),
      createPhotoFile("photo-a", "2026-04-22T12:00:00.000Z", "a.png"),
      createPhotoFile("photo-b", "2026-04-22T12:00:00.000Z", "b.png"),
    ];

    const assets = await prepareActividadGrupalActaPhotoAssets(photoFiles, storage);

    assert.deepEqual(
      assets.map((asset) => asset.id),
      ["photo-a", "photo-b", "photo-c"],
    );
    assert.equal(storage.readRequests.length, 3);

    const firstAssetBuffer = Buffer.from(assets[0]?.dataUrl.split(",")[1] ?? "", "base64");
    const metadata = await sharp(firstAssetBuffer).metadata();

    assert.equal(metadata.format, "jpeg");
    assert.equal((metadata.width ?? 0) <= 1_600, true);
    assert.equal((metadata.height ?? 0) <= 1_600, true);
  });

  it("fails with a controlled error when the stored photo cannot be read", async () => {
    const storage: ActividadesGrupalesFilesStorage = {
      async saveFile() {
        throw new Error("not used");
      },
      async readFile() {
        throw new Error("missing file");
      },
      async deleteFile() {
        throw new Error("not used");
      },
    };

    await assert.rejects(
      () =>
        prepareActividadGrupalActaPhotoAssets(
          [createPhotoFile("photo-a", "2026-04-22T12:00:00.000Z", "missing.png")],
          storage,
        ),
      /No fue posible preparar la foto/,
    );
  });

  it("normalizes five mixed jpeg, png and webp photos", async () => {
    const sourceByName = new Map<string, Buffer>([
      ["evidencia-1.jpg", await createSourceImage("jpeg", "#2e7d67")],
      ["evidencia-2.png", await createSourceImage("png", "#f2b544")],
      ["evidencia-3.webp", await createSourceImage("webp", "#456990")],
      ["evidencia-4.jpg", await createSourceImage("jpeg", "#d95d39")],
      ["evidencia-5.png", await createSourceImage("png", "#7a5195")],
    ]);
    const storage = createStorageByOriginalName(sourceByName);
    const photoFiles = [...sourceByName.keys()].map((originalName, index) =>
      createPhotoFile(
        `photo-${index + 1}`,
        `2026-04-2${index + 1}T12:00:00.000Z`,
        originalName,
        resolveMimeType(originalName),
      ),
    );

    const assets = await prepareActividadGrupalActaPhotoAssets(photoFiles, storage);

    assert.equal(assets.length, 5);
    assert.equal(storage.readRequests.length, 5);

    for (const asset of assets) {
      assert.match(asset.dataUrl, /^data:image\/jpeg;base64,/);
      const normalizedBuffer = Buffer.from(asset.dataUrl.split(",")[1] ?? "", "base64");
      const metadata = await sharp(normalizedBuffer).metadata();

      assert.equal(metadata.format, "jpeg");
      assert.equal((metadata.width ?? 0) <= 1_600, true);
      assert.equal((metadata.height ?? 0) <= 1_600, true);
    }
  });
});

function createPhotoFile(
  id: string,
  createdAt: string,
  originalName: string,
  mimeType = "image/png",
): ActividadGrupalSupportFileRecord {
  return {
    id,
    activityId: "activity-1",
    kind: "support_photo",
    originalName,
    mimeType,
    sizeBytes: 12_345,
    relativePath: `photos/${originalName}`,
    createdAt: new Date(createdAt),
  };
}

async function createSourceImage(
  format: "jpeg" | "png" | "webp",
  background: string,
): Promise<Buffer> {
  return sharp({
    create: {
      width: 32,
      height: 24,
      channels: 3,
      background,
    },
  })
    [format]()
    .toBuffer();
}

function resolveMimeType(originalName: string): string {
  if (originalName.endsWith(".jpg")) {
    return "image/jpeg";
  }

  if (originalName.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/png";
}

function createStorage(buffer: Buffer): ActividadesGrupalesFilesStorage & {
  readRequests: Array<{ relativePath: string; originalName: string; contentType: string }>;
} {
  const readRequests: Array<{ relativePath: string; originalName: string; contentType: string }> =
    [];

  return {
    readRequests,
    async saveFile() {
      throw new Error("not used");
    },
    async readFile(relativePath: string, originalName: string, contentType: string) {
      readRequests.push({ relativePath, originalName, contentType });

      return {
        buffer,
        contentType,
        originalName,
      };
    },
    async deleteFile() {
      throw new Error("not used");
    },
  };
}

function createStorageByOriginalName(
  sourceByName: ReadonlyMap<string, Buffer>,
): ActividadesGrupalesFilesStorage & {
  readRequests: Array<{ relativePath: string; originalName: string; contentType: string }>;
} {
  const readRequests: Array<{ relativePath: string; originalName: string; contentType: string }> =
    [];

  return {
    readRequests,
    async saveFile() {
      throw new Error("not used");
    },
    async readFile(relativePath: string, originalName: string, contentType: string) {
      readRequests.push({ relativePath, originalName, contentType });
      const buffer = sourceByName.get(originalName);

      if (buffer === undefined) {
        throw new Error(`missing test photo: ${originalName}`);
      }

      return { buffer, contentType, originalName };
    },
    async deleteFile() {
      throw new Error("not used");
    },
  };
}
