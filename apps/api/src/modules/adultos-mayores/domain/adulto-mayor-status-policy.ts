import { BadRequestException } from "@nestjs/common";

import { hasUserPermission, type AdultoMayorStatus, type AuthUser } from "@cuidarte/contracts";

import { formatCurrentDate, formatDateForMessage } from "./adulto-mayor-dates";
import {
  assertAdultoMayorProgramDateAllowed,
  type AdultoMayorProgramPeriodRange,
} from "./adulto-mayor-program-policy";

export function assertAdultoMayorStatusData(params: {
  status: AdultoMayorStatus;
  birthDate: string;
  deathDate: string | null;
}) {
  if (params.status === "deceased" && params.deathDate === null) {
    throw new BadRequestException(
      "Indica la fecha de defuncion para marcar al adulto mayor como fallecido.",
    );
  }

  if (params.status === "alive" && params.deathDate !== null) {
    throw new BadRequestException(
      "Un adulto mayor vivo no puede conservar una fecha de defuncion.",
    );
  }

  if (params.deathDate === null) {
    return;
  }

  if (params.deathDate < params.birthDate) {
    throw new BadRequestException(
      "La fecha de defuncion no puede ser anterior a la fecha de nacimiento.",
    );
  }

  if (params.deathDate > formatCurrentDate()) {
    throw new BadRequestException("La fecha de defuncion no puede ser futura.");
  }
}

export function assertAdultoMayorRecordDateAllowed(params: {
  status?: AdultoMayorStatus | undefined;
  deathDate?: string | null | undefined;
  programPeriods?: readonly AdultoMayorProgramPeriodRange[] | undefined;
  recordDate: string;
}) {
  if (
    params.status === "deceased" &&
    params.deathDate !== undefined &&
    params.deathDate !== null &&
    params.recordDate > params.deathDate
  ) {
    throw new BadRequestException(
      `No puedes registrar informacion posterior a la fecha de defuncion del adulto mayor (${formatDateForMessage(params.deathDate)}).`,
    );
  }

  if (params.programPeriods !== undefined) {
    assertAdultoMayorProgramDateAllowed({
      programPeriods: params.programPeriods,
      recordDate: params.recordDate,
    });
  }
}

export function canCorrectDeceasedStatus(actor: Pick<AuthUser, "role" | "permissions">) {
  return hasUserPermission(actor, "adultos_mayores.edit");
}
