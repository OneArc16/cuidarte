import { BadRequestException } from "@nestjs/common";

import { type AdultoMayorStatus, type AuthUser } from "@cuidarte/contracts";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

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
  recordDate: string;
}) {
  if (params.status !== "deceased" || params.deathDate === undefined || params.deathDate === null) {
    return;
  }

  if (params.recordDate > params.deathDate) {
    throw new BadRequestException(
      `No puedes registrar informacion posterior a la fecha de defuncion del adulto mayor (${formatDateForMessage(params.deathDate)}).`,
    );
  }
}

export function canCorrectDeceasedStatus(actor: Pick<AuthUser, "role">) {
  return actor.role === "super_admin" || actor.role === "admin" || actor.role === "director";
}

function formatCurrentDate() {
  const parts = DATE_FORMATTER.formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function formatDateForMessage(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
