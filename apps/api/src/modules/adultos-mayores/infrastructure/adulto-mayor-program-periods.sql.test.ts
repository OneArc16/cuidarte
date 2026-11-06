import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PgDialect } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";

import { adultosMayores } from "../../../database/schema";
import {
  adultoMayorActiveInProgramOn,
  selectAdultoMayorProgramPeriods,
} from "./adulto-mayor-program-periods.sql";

const db = drizzle.mock();

describe("program period SQL helpers", () => {
  it("binds the subqueries to the outer adulto mayor even in a single-table select", () => {
    const query = db
      .select({ periods: selectAdultoMayorProgramPeriods(adultosMayores.id) })
      .from(adultosMayores)
      .where(adultoMayorActiveInProgramOn(adultosMayores.id, "2026-09-01"))
      .toSQL();

    const binding = '"program_period"."adulto_mayor_id" = "adultos_mayores"."id"';
    assert.equal(query.sql.split(binding).length - 1, 2);
    assert.deepEqual(query.params, ["2026-09-01", "2026-09-01"]);
  });

  it("treats the inactivation date as the first day out of the program", () => {
    const { sql } = new PgDialect().sqlToQuery(
      adultoMayorActiveInProgramOn(adultosMayores.id, "2026-09-01"),
    );

    assert.match(sql, /"program_period"\."activation_date" <= \$1/);
    assert.match(
      sql,
      /\("program_period"\."inactivation_date" is null or "program_period"\."inactivation_date" > \$2\)/,
    );
  });
});
