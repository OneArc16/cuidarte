import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defaultEmpleadoPermissions } from "./empleado.policy";

describe("defaultEmpleadoPermissions", () => {
  it("grants report downloads by default only to administrative roles", () => {
    assert.ok(defaultEmpleadoPermissions("super_admin").includes("reportes.export"));
    assert.ok(defaultEmpleadoPermissions("admin").includes("reportes.export"));
    assert.ok(defaultEmpleadoPermissions("director").includes("reportes.export"));
    assert.ok(!defaultEmpleadoPermissions("auditor").includes("reportes.export"));
    assert.ok(!defaultEmpleadoPermissions("nutricionista").includes("reportes.export"));
  });
});
