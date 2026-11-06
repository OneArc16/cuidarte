import { BadRequestException } from "@nestjs/common";

import { hasUserPermission, type AdultoMayorStatus, type AuthUser } from "@cuidarte/contracts";

import { formatDateForMessage } from "./adulto-mayor-dates";

export function canManageAdultoMayorProgram(actor: Pick<AuthUser, "permissions">) {
  return hasUserPermission(actor, "adultos_mayores.manage_program");
}

export type AdultoMayorProgramPeriodRange = {
  activationDate: string;
  inactivationDate: string | null;
};

/**
 * A period covers its activation date and every day before its inactivation date:
 * from the inactivation date on, the adulto mayor is out of the program.
 */
export function isDateWithinProgramPeriods(
  periods: readonly AdultoMayorProgramPeriodRange[],
  date: string,
) {
  return periods.some(
    (period) =>
      period.activationDate <= date &&
      (period.inactivationDate === null || date < period.inactivationDate),
  );
}

export function assertAdultoMayorProgramDateAllowed(params: {
  programPeriods: readonly AdultoMayorProgramPeriodRange[];
  recordDate: string;
}) {
  if (isDateWithinProgramPeriods(params.programPeriods, params.recordDate)) {
    return;
  }

  throw new BadRequestException(
    `El adulto mayor no estaba activo en el programa en la fecha del registro (${formatDateForMessage(params.recordDate)}).`,
  );
}

export function assertAdultoMayorActivationDate(params: {
  activationDate: string;
  birthDate: string;
  deathDate?: string | null;
  today: string;
}) {
  if (params.activationDate > params.today) {
    throw new BadRequestException("La fecha de activacion no puede ser futura.");
  }

  if (params.activationDate < params.birthDate) {
    throw new BadRequestException(
      "La fecha de activacion no puede ser anterior a la fecha de nacimiento.",
    );
  }

  if (
    params.deathDate !== undefined &&
    params.deathDate !== null &&
    params.activationDate > params.deathDate
  ) {
    throw new BadRequestException(
      `La fecha de activacion no puede ser posterior a la fecha de defuncion (${formatDateForMessage(params.deathDate)}).`,
    );
  }
}

export function assertAdultoMayorCanBeInactivated<
  TPeriod extends AdultoMayorProgramPeriodRange,
>(params: { periods: readonly TPeriod[]; inactivationDate: string; today: string }): TPeriod {
  const openPeriod = params.periods.find((period) => period.inactivationDate === null);

  if (openPeriod === undefined) {
    throw new BadRequestException("El adulto mayor ya esta inactivo en el programa.");
  }

  if (params.inactivationDate > params.today) {
    throw new BadRequestException("La fecha de inactivacion no puede ser futura.");
  }

  if (params.inactivationDate <= openPeriod.activationDate) {
    throw new BadRequestException(
      `La fecha de inactivacion debe ser posterior a la fecha de activacion (${formatDateForMessage(openPeriod.activationDate)}).`,
    );
  }

  return openPeriod;
}

export function assertAdultoMayorCanBeReintegrated(params: {
  periods: readonly AdultoMayorProgramPeriodRange[];
  activationDate: string;
  status: AdultoMayorStatus;
  today: string;
}) {
  if (params.status === "deceased") {
    throw new BadRequestException("No puedes reintegrar a un adulto mayor fallecido.");
  }

  if (params.periods.some((period) => period.inactivationDate === null)) {
    throw new BadRequestException("El adulto mayor ya esta activo en el programa.");
  }

  if (params.activationDate > params.today) {
    throw new BadRequestException("La fecha de reintegro no puede ser futura.");
  }

  const lastInactivationDate = params.periods.reduce<string | null>(
    (latest, period) =>
      period.inactivationDate !== null && (latest === null || period.inactivationDate > latest)
        ? period.inactivationDate
        : latest,
    null,
  );

  if (lastInactivationDate !== null && params.activationDate < lastInactivationDate) {
    throw new BadRequestException(
      `La fecha de reintegro no puede ser anterior a la ultima fecha de inactivacion (${formatDateForMessage(lastInactivationDate)}).`,
    );
  }
}
