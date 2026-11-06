import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BadRequestException } from "@nestjs/common";

import {
  assertAdultoMayorActivationDate,
  assertAdultoMayorCanBeInactivated,
  assertAdultoMayorCanBeReintegrated,
  isDateWithinProgramPeriods,
} from "./adulto-mayor-program-policy";
import { assertAdultoMayorRecordDateAllowed } from "./adulto-mayor-status-policy";

const periods = [
  { activationDate: "2026-01-10", inactivationDate: "2026-05-01" },
  { activationDate: "2026-06-01", inactivationDate: null },
];

describe("politica de periodos del programa de adultos mayores", () => {
  it("incluye la fecha de activacion y excluye desde la fecha de inactivacion", () => {
    assert.equal(isDateWithinProgramPeriods(periods, "2026-01-09"), false);
    assert.equal(isDateWithinProgramPeriods(periods, "2026-01-10"), true);
    assert.equal(isDateWithinProgramPeriods(periods, "2026-04-30"), true);
    assert.equal(isDateWithinProgramPeriods(periods, "2026-05-01"), false);
    assert.equal(isDateWithinProgramPeriods(periods, "2026-05-15"), false);
    assert.equal(isDateWithinProgramPeriods(periods, "2026-06-01"), true);
    assert.equal(isDateWithinProgramPeriods(periods, "2030-01-01"), true);
    assert.equal(isDateWithinProgramPeriods([], "2026-06-01"), false);
  });

  it("rechaza registros fuera de los periodos activos y conserva la regla de defuncion", () => {
    assert.doesNotThrow(() =>
      assertAdultoMayorRecordDateAllowed({
        status: "alive",
        deathDate: null,
        programPeriods: periods,
        recordDate: "2026-06-02",
      }),
    );

    assert.throws(
      () =>
        assertAdultoMayorRecordDateAllowed({
          status: "alive",
          deathDate: null,
          programPeriods: periods,
          recordDate: "2026-05-15",
        }),
      (error: unknown) =>
        error instanceof BadRequestException &&
        error.message ===
          "El adulto mayor no estaba activo en el programa en la fecha del registro (15/05/2026).",
    );

    assert.throws(
      () =>
        assertAdultoMayorRecordDateAllowed({
          status: "deceased",
          deathDate: "2026-06-10",
          programPeriods: periods,
          recordDate: "2026-06-11",
        }),
      BadRequestException,
    );
  });

  it("valida la fecha de activacion contra el nacimiento y el dia actual", () => {
    assert.doesNotThrow(() =>
      assertAdultoMayorActivationDate({
        activationDate: "2026-01-10",
        birthDate: "1940-01-01",
        today: "2026-11-06",
      }),
    );
    assert.throws(
      () =>
        assertAdultoMayorActivationDate({
          activationDate: "2026-11-07",
          birthDate: "1940-01-01",
          today: "2026-11-06",
        }),
      BadRequestException,
    );
    assert.throws(
      () =>
        assertAdultoMayorActivationDate({
          activationDate: "1939-12-31",
          birthDate: "1940-01-01",
          today: "2026-11-06",
        }),
      BadRequestException,
    );
  });

  it("solo inactiva un periodo abierto con fecha posterior a su activacion", () => {
    assert.equal(
      assertAdultoMayorCanBeInactivated({
        periods,
        inactivationDate: "2026-07-01",
        today: "2026-11-06",
      }).activationDate,
      "2026-06-01",
    );
    assert.throws(
      () =>
        assertAdultoMayorCanBeInactivated({
          periods,
          inactivationDate: "2026-06-01",
          today: "2026-11-06",
        }),
      BadRequestException,
    );
    assert.throws(
      () =>
        assertAdultoMayorCanBeInactivated({
          periods,
          inactivationDate: "2026-11-07",
          today: "2026-11-06",
        }),
      BadRequestException,
    );
    assert.throws(
      () =>
        assertAdultoMayorCanBeInactivated({
          periods: [periods[0]!],
          inactivationDate: "2026-07-01",
          today: "2026-11-06",
        }),
      BadRequestException,
    );
  });

  it("solo reintegra adultos vivos e inactivos desde la ultima fecha de salida", () => {
    const closed = [periods[0]!];

    assert.doesNotThrow(() =>
      assertAdultoMayorCanBeReintegrated({
        periods: closed,
        activationDate: "2026-05-01",
        status: "alive",
        today: "2026-11-06",
      }),
    );
    assert.throws(
      () =>
        assertAdultoMayorCanBeReintegrated({
          periods: closed,
          activationDate: "2026-04-30",
          status: "alive",
          today: "2026-11-06",
        }),
      BadRequestException,
    );
    assert.throws(
      () =>
        assertAdultoMayorCanBeReintegrated({
          periods,
          activationDate: "2026-07-01",
          status: "alive",
          today: "2026-11-06",
        }),
      BadRequestException,
    );
    assert.throws(
      () =>
        assertAdultoMayorCanBeReintegrated({
          periods: closed,
          activationDate: "2026-06-01",
          status: "deceased",
          today: "2026-11-06",
        }),
      BadRequestException,
    );
    assert.throws(
      () =>
        assertAdultoMayorCanBeReintegrated({
          periods: closed,
          activationDate: "2026-11-07",
          status: "alive",
          today: "2026-11-06",
        }),
      BadRequestException,
    );
  });
});
