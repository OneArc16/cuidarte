import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BadRequestException } from "@nestjs/common";

import {
  assertAdultoMayorRecordDateAllowed,
  assertAdultoMayorStatusData,
} from "./adulto-mayor-status-policy";

describe("politica de estados de adultos mayores", () => {
  it("requiere fecha de defuncion para el estado fallecido", () => {
    assert.throws(
      () =>
        assertAdultoMayorStatusData({
          status: "deceased",
          birthDate: "1940-01-01",
          deathDate: null,
        }),
      BadRequestException,
    );
  });

  it("permite registros en la fecha de defuncion y rechaza fechas posteriores", () => {
    assert.doesNotThrow(() =>
      assertAdultoMayorRecordDateAllowed({
        status: "deceased",
        deathDate: "2026-06-10",
        recordDate: "2026-06-10",
      }),
    );

    assert.throws(
      () =>
        assertAdultoMayorRecordDateAllowed({
          status: "deceased",
          deathDate: "2026-06-10",
          recordDate: "2026-06-11",
        }),
      BadRequestException,
    );
  });
});
