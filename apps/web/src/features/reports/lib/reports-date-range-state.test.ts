import { beforeEach, describe, expect, it } from "vitest";

import { loadReportsDateRange, saveReportsDateRange } from "./reports-date-range-state";

describe("reports date range state", () => {
  const fallback = { from: "2026-10-01", to: "2026-10-08" };

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("restores the saved range for the same user", () => {
    saveReportsDateRange("user-1", { from: "2026-08-01", to: "2026-08-31" });

    expect(loadReportsDateRange("user-1", fallback)).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });

  it("falls back when the stored range is invalid", () => {
    window.sessionStorage.setItem(
      "cuidarte:reports:date-range:user-1",
      JSON.stringify({ from: "2026-10-08", to: "2026-10-01" }),
    );

    expect(loadReportsDateRange("user-1", fallback)).toEqual(fallback);
  });
});
