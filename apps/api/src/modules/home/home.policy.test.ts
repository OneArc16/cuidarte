import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser, homeDashboardAccessRoleValues } from "@cuidarte/contracts";

import { canViewHomeDashboard } from "./home.policy";

describe("home policy", () => {
  it("allows only the dashboard roles", () => {
    for (const role of homeDashboardAccessRoleValues) {
      assert.equal(canViewHomeDashboard({ role }), true);
    }

    assert.equal(canViewHomeDashboard({ role: "medico" as AuthUser["role"] }), false);
  });
});
