import { describe, expect, it } from "vitest";

import { canViewHomeDashboard } from "./home-dashboard-permissions";

describe("home dashboard permissions", () => {
  it("allows only the dashboard roles", () => {
    expect(canViewHomeDashboard({ role: "super_admin" })).toBe(true);
    expect(canViewHomeDashboard({ role: "admin" })).toBe(true);
    expect(canViewHomeDashboard({ role: "auditor" })).toBe(true);
    expect(canViewHomeDashboard({ role: "director" })).toBe(true);
    expect(canViewHomeDashboard({ role: "medico" })).toBe(false);
  });
});
