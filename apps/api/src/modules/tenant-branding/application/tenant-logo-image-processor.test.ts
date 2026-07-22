import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import sharp from "sharp";

import {
  MAX_TENANT_LOGO_FILE_SIZE_BYTES,
  TenantLogoImageProcessor,
} from "./tenant-logo-image-processor";

describe("TenantLogoImageProcessor", () => {
  const processor = new TenantLogoImageProcessor();

  for (const image of [
    { extension: ".png", mimeType: "image/png", format: "png" as const },
    { extension: ".jpg", mimeType: "image/jpeg", format: "jpeg" as const },
    { extension: ".webp", mimeType: "image/webp", format: "webp" as const },
  ]) {
    it(`normalizes a valid ${image.format} logo to PNG`, async () => {
      const source = await sharp({
        create: { width: 240, height: 120, channels: 4, background: "#16866d" },
      })
        .toFormat(image.format)
        .toBuffer();

      const result = await processor.process({
        originalName: `logo${image.extension}`,
        mimeType: image.mimeType,
        sizeBytes: source.byteLength,
        buffer: source,
      });

      assert.equal(result.mimeType, "image/png");
      assert.equal((await sharp(result.buffer).metadata()).format, "png");
      assert.equal(result.checksum, createHash("sha256").update(result.buffer).digest("hex"));
    });
  }

  it("rejects empty, oversized and disguised files", async () => {
    await assert.rejects(
      () =>
        processor.process({
          originalName: "logo.png",
          mimeType: "image/png",
          sizeBytes: 0,
          buffer: Buffer.alloc(0),
        }),
      /no puede estar vacia/,
    );
    await assert.rejects(
      () =>
        processor.process({
          originalName: "logo.png",
          mimeType: "image/png",
          sizeBytes: MAX_TENANT_LOGO_FILE_SIZE_BYTES + 1,
          buffer: Buffer.from("not-an-image"),
        }),
      /no puede superar 2 MB/,
    );
    await assert.rejects(
      () =>
        processor.process({
          originalName: "logo.png",
          mimeType: "image/png",
          sizeBytes: 12,
          buffer: Buffer.from("not-an-image"),
        }),
      /No fue posible leer la imagen/,
    );
    await assert.rejects(
      () =>
        processor.process({
          originalName: "logo.svg",
          mimeType: "image/svg+xml",
          sizeBytes: 11,
          buffer: Buffer.from("<svg></svg>"),
        }),
      /PNG, JPEG o WebP/,
    );
    const jpeg = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "white" },
    })
      .jpeg()
      .toBuffer();
    await assert.rejects(
      () =>
        processor.process({
          originalName: "disguised.png",
          mimeType: "image/png",
          sizeBytes: jpeg.byteLength,
          buffer: jpeg,
        }),
      /PNG, JPEG o WebP/,
    );
  });

  it("rejects dimensions outside the accepted range", async () => {
    const tooSmall = await sharp({
      create: { width: 31, height: 32, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    const tooWide = await sharp({
      create: { width: 4_001, height: 32, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();

    await assert.rejects(() => processor.process(upload("small.png", tooSmall)), /32 x 32/);
    await assert.rejects(() => processor.process(upload("wide.png", tooWide)), /4000 x 4000/);
  });

  it("corrects orientation, preserves proportions and strips metadata", async () => {
    const source = await sharp({
      create: { width: 2_400, height: 1_200, channels: 3, background: "#ffffff" },
    })
      .withMetadata({ orientation: 1 })
      .png()
      .toBuffer();
    const result = await processor.process(upload("logo.png", source));
    const metadata = await sharp(result.buffer).metadata();

    assert.equal(result.width, 1_200);
    assert.equal(result.height, 600);
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.orientation, undefined);
  });
});

function upload(originalName: string, buffer: Buffer) {
  return {
    originalName,
    mimeType: "image/png",
    sizeBytes: buffer.byteLength,
    buffer,
  };
}
