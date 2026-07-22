import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { describe, it } from "node:test";

import { MAX_TENANT_LOGO_FILE_SIZE_BYTES } from "../application/tenant-logo-image-processor";
import {
  parseTenantLogoMultipartRequest,
  TenantBrandingController,
} from "./tenant-branding.controller";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";

describe("parseTenantLogoMultipartRequest", () => {
  it("requires multipart and exactly one logo file", async () => {
    await assert.rejects(
      () => parseTenantLogoMultipartRequest(request([], false) as never),
      /multipart\/form-data/,
    );
    await assert.rejects(
      () => parseTenantLogoMultipartRequest(request([]) as never),
      /Debes adjuntar/,
    );
    await assert.rejects(
      () => parseTenantLogoMultipartRequest(request([filePart("logo"), filePart("logo")]) as never),
      /Solo puedes adjuntar/,
    );
  });

  it("rejects unexpected fields and file names", async () => {
    await assert.rejects(
      () =>
        parseTenantLogoMultipartRequest(
          request([{ type: "field", fieldname: "tenantId", value: "unsafe" }]) as never,
        ),
      /no admite campos adicionales/,
    );
    await assert.rejects(
      () => parseTenantLogoMultipartRequest(request([filePart("avatar")]) as never),
      /archivo no soportado/,
    );
  });

  it("returns the buffered logo upload", async () => {
    const result = await parseTenantLogoMultipartRequest(request([filePart("logo")]) as never);

    assert.equal(result.originalName, "centro.png");
    assert.equal(result.mimeType, "image/png");
    assert.deepEqual(result.buffer, Buffer.from("png"));
  });

  it("rejects a file as soon as it exceeds the endpoint limit", async () => {
    await assert.rejects(
      () =>
        parseTenantLogoMultipartRequest(
          request([filePart("logo", Buffer.alloc(MAX_TENANT_LOGO_FILE_SIZE_BYTES + 1))]) as never,
        ),
      { name: "PayloadTooLargeException" },
    );
  });

  it("serves the active PNG inline with private no-store caching", async () => {
    const headers = new Map<string, string>();
    const service = {
      async getAdministrativeLogoFile() {
        return {
          file: { buffer: Buffer.from("png"), contentType: "image/png" as const },
          version: { originalName: "Lógó 🫶.webp" },
        };
      },
    };
    const controller = new TenantBrandingController(service as never);
    const reply = {
      header(name: string, value: string) {
        headers.set(name, value);
        return this;
      },
      send(buffer: Buffer) {
        return buffer;
      },
    };

    const response = await controller.getLogoFile(
      tenantId,
      { currentUser: { role: "super_admin" } } as never,
      reply as never,
    );

    assert.deepEqual(response, Buffer.from("png"));
    assert.equal(headers.get("Content-Type"), "image/png");
    assert.equal(headers.get("Cache-Control"), "private, no-store");
    assert.equal(headers.get("Content-Disposition"), 'inline; filename="Logo --.png"');
  });
});

function request(parts: unknown[], isMultipart = true) {
  return {
    isMultipart: () => isMultipart,
    async *parts() {
      for (const part of parts) {
        yield part;
      }
    },
  };
}

function filePart(fieldname: string, content = Buffer.from("png")) {
  return {
    type: "file",
    fieldname,
    filename: "centro.png",
    mimetype: "image/png",
    file: Object.assign(Readable.from([content]), { truncated: false }),
    async toBuffer() {
      return content;
    },
  };
}
