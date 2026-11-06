import { getTableName, sql, type SQL } from "drizzle-orm";
import { type AnyPgColumn } from "drizzle-orm/pg-core";

import { adultoMayorProgramPeriods } from "../../../database/schema";
import { type AdultoMayorProgramPeriodRange } from "../domain/adulto-mayor-program-policy";
import { type AdultoMayorExportProgramPeriod } from "../domain/adulto-mayor.types";

const PERIODS_ALIAS = sql.identifier("program_period");

/**
 * Drizzle renders columns without their table name inside a single-table select list, and
 * an unqualified `"id"` inside the subqueries below would bind to the period row instead of
 * the outer adulto mayor. Always render the outer column fully qualified.
 */
function qualified(column: AnyPgColumn): SQL {
  return sql`${sql.identifier(getTableName(column.table))}.${sql.identifier(column.name)}`;
}

function periodColumn(column: AnyPgColumn): SQL {
  return sql`${PERIODS_ALIAS}.${sql.identifier(column.name)}`;
}

/** Every program period of the adulto mayor, oldest first, as `{ activationDate, inactivationDate }`. */
export function selectAdultoMayorProgramPeriods(adultoMayorId: AnyPgColumn) {
  const activationDate = periodColumn(adultoMayorProgramPeriods.activationDate);

  return sql<AdultoMayorProgramPeriodRange[]>`coalesce((
    select json_agg(
      json_build_object(
        'activationDate', ${activationDate},
        'inactivationDate', ${periodColumn(adultoMayorProgramPeriods.inactivationDate)}
      )
      order by ${activationDate}
    )
    from ${adultoMayorProgramPeriods} as ${PERIODS_ALIAS}
    where ${periodColumn(adultoMayorProgramPeriods.adultoMayorId)} = ${qualified(adultoMayorId)}
  ), '[]'::json)`;
}

/** Same as `selectAdultoMayorProgramPeriods`, plus the reasons; used by exports. */
export function selectAdultoMayorProgramPeriodsWithReasons(adultoMayorId: AnyPgColumn) {
  const activationDate = periodColumn(adultoMayorProgramPeriods.activationDate);

  return sql<AdultoMayorExportProgramPeriod[]>`coalesce((
    select json_agg(
      json_build_object(
        'activationDate', ${activationDate},
        'inactivationDate', ${periodColumn(adultoMayorProgramPeriods.inactivationDate)},
        'activationReason', ${periodColumn(adultoMayorProgramPeriods.activationReason)},
        'inactivationReason', ${periodColumn(adultoMayorProgramPeriods.inactivationReason)}
      )
      order by ${activationDate}
    )
    from ${adultoMayorProgramPeriods} as ${PERIODS_ALIAS}
    where ${periodColumn(adultoMayorProgramPeriods.adultoMayorId)} = ${qualified(adultoMayorId)}
  ), '[]'::json)`;
}

/** True when the adulto mayor was active in the program on `date` (YYYY-MM-DD). */
export function adultoMayorActiveInProgramOn(adultoMayorId: AnyPgColumn, date: string): SQL {
  const inactivationDate = periodColumn(adultoMayorProgramPeriods.inactivationDate);

  return sql`exists (
    select 1
    from ${adultoMayorProgramPeriods} as ${PERIODS_ALIAS}
    where ${periodColumn(adultoMayorProgramPeriods.adultoMayorId)} = ${qualified(adultoMayorId)}
      and ${periodColumn(adultoMayorProgramPeriods.activationDate)} <= ${date}
      and (${inactivationDate} is null or ${inactivationDate} > ${date})
  )`;
}
