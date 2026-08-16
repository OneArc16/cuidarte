import { describe, expect, it } from "vitest";

import { canCreateEmpleados, canEditEmpleados, canOpenEmpleados } from "./empleados-permissions";

describe("empleados permissions", () => {
  it("allows auditor users to open the module in read-only mode", () => {
    expect(canOpenEmpleados({ role: "auditor" })).toBe(true);
    expect(canCreateEmpleados({ role: "auditor" })).toBe(false);
    expect(canEditEmpleados({ role: "auditor" })).toBe(false);
  });

  it("allows admin users to manage employees", () => {
    expect(canOpenEmpleados({ role: "admin" })).toBe(true);
    expect(canCreateEmpleados({ role: "admin" })).toBe(true);
    expect(canEditEmpleados({ role: "admin" })).toBe(true);
  });

  it("allows director users to open, create and edit users in their tenant scope", () => {
    expect(canOpenEmpleados({ role: "director" })).toBe(true);
    expect(canCreateEmpleados({ role: "director" })).toBe(true);
    expect(canEditEmpleados({ role: "director" })).toBe(true);
  });

  it("denies unsupported roles", () => {
    expect(canOpenEmpleados({ role: "medico" })).toBe(false);
    expect(canCreateEmpleados({ role: "medico" })).toBe(false);
    expect(canEditEmpleados({ role: "medico" })).toBe(false);
  });
});
