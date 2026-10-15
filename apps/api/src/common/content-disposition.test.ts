import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildContentDisposition } from "./content-disposition";

describe("buildContentDisposition", () => {
  it("builds a safe ASCII fallback and preserves the UTF-8 filename", () => {
    assert.equal(
      buildContentDisposition("attachment", "Acta sesión José.pdf"),
      'attachment; filename="Acta sesion Jose.pdf"; filename*=UTF-8\'\'Acta%20sesi%C3%B3n%20Jos%C3%A9.pdf',
    );
  });

  it("removes unsafe header characters from the ASCII fallback", () => {
    const header = buildContentDisposition(
      "inline",
      'archivo"\r\nmalicioso.pdf',
    );

    assert.equal(
      header,
      'inline; filename="archivo___malicioso.pdf"; filename*=UTF-8\'\'archivo%22%0D%0Amalicioso.pdf',
    );

    assert.equal(header.includes("\r"), false);
    assert.equal(header.includes("\n"), false);
  });

  it("uses a fallback when the filename is empty", () => {
    assert.equal(
      buildContentDisposition("attachment", "   "),
      'attachment; filename="documento"; filename*=UTF-8\'\'documento',
    );
  });
});
