import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { getRequiredPdfLetterheadDataUrl } from "./pdf-letterhead";

describe("getRequiredPdfLetterheadDataUrl", () => {
  it("resolves the bundled letterhead from the API working directory", async () => {
    assert.equal(path.basename(process.cwd()), "api");

    const dataUrl = await getRequiredPdfLetterheadDataUrl();

    assert.match(dataUrl, /^data:image\/png;base64,.+/);
  });
});
