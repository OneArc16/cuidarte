import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { adultosMayores, alimentacionRegistros } from "../../../database/schema";
import { DrizzleReportsDashboardRepository } from "./drizzle-reports-dashboard.repository";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";

describe("DrizzleReportsDashboardRepository", () => {
  it("excludes food records that belong to deleted older adults", async () => {
    const state = {
      fromTable: null as unknown,
      joinedTables: [] as unknown[],
      whereSql: "",
    };
    const chain = {
      from(table: unknown) {
        state.fromTable = table;
        return chain;
      },
      innerJoin(table: unknown) {
        state.joinedTables.push(table);
        return chain;
      },
      where(condition: SQL) {
        state.whereSql = new PgDialect().sqlToQuery(condition).sql;
        return chain;
      },
      groupBy() {
        return chain;
      },
      async orderBy() {
        return [];
      },
    };
    const repository = new DrizzleReportsDashboardRepository({
      db: {
        select() {
          return chain;
        },
      },
    } as never);

    await (
      repository as unknown as {
        aggregateFood(query: {
          from: string;
          to: string;
          scope: { tenantId: string };
        }): Promise<unknown>;
      }
    ).aggregateFood({
      from: "2026-09-01",
      to: "2026-09-30",
      scope: { tenantId },
    });

    assert.equal(state.fromTable, alimentacionRegistros);
    assert.deepEqual(state.joinedTables, [adultosMayores]);
    assert.match(state.whereSql, /"adultos_mayores"\."deleted_at" is null/);
  });
});
