import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { resolveReadBaseDirs } from "./local-empleados-signature-files.storage";

describe("LocalEmpleadosSignatureFilesStorage", () => {
  it("includes the stable API storage dir, cwd fallback, and legacy fallback", () => {
    const baseDirs = resolveReadBaseDirs(
      ".data/uploads/empleados-signatures",
      "/home/daniel/cuidarte",
    );

    assert.equal(baseDirs.length, 3);
    assert.ok(
      baseDirs.some((entry) =>
        entry.endsWith(path.join("apps", "api", ".data", "uploads", "empleados-signatures")),
      ),
    );
    assert.ok(
      baseDirs.some((entry) =>
        entry.endsWith(path.join(".data", "uploads", "empleados-signatures")),
      ),
    );
    assert.ok(baseDirs.includes(path.resolve("/tmp/cuidarte/empleados-signatures")));
  });
});
