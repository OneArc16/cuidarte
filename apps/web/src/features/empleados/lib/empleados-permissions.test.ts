import { describe, expect, it } from "vitest";

import { canManageEmpleados, canOpenEmpleados } from "./empleados-permissions";

describe("empleados permissions", () => {
  it("allows auditor users to open the module in read-only mode", () => {
    expect(canOpenEmpleados({ role: "auditor" })).toBe(true);
    expect(canManageEmpleados({ role: "auditor" })).toBe(false);
  });

  it("allows admin users to manage employees", () => {
    expect(canOpenEmpleados({ role: "admin" })).toBe(true);
    expect(canManageEmpleados({ role: "admin" })).toBe(true);
  });

  it("denies unsupported roles", () => {
    expect(canOpenEmpleados({ role: "medico" })).toBe(false);
    expect(canManageEmpleados({ role: "medico" })).toBe(false);
  });
});
