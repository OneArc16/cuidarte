import { type ActividadGrupalOrganizer } from "@cuidarte/contracts";

export const ACTIVIDAD_GRUPAL_ACTA_PREFIX: Record<ActividadGrupalOrganizer, string> = {
  director: "DIREC",
  medico: "SALUD",
  enfermeria: "SALUD",
  psicologa: "PSICO",
  trabajadora_social: "PSICO",
  nutricionista: "NUTRI",
  fisioterapeuta: "FISIO",
  recreacionista: "RECRE",
};

/**
 * The acta series may be owned by a professional team rather than one role.
 * `actaOrganizer` persists this canonical series key, while `organizer`
 * continues to identify the professional responsible for the activity.
 */
export function resolveActividadGrupalActaOrganizer(
  organizer: ActividadGrupalOrganizer,
): ActividadGrupalOrganizer {
  switch (organizer) {
    case "medico":
    case "enfermeria":
      return "medico";
    case "psicologa":
    case "trabajadora_social":
      return "psicologa";
    default:
      return organizer;
  }
}

export function usesSharedActividadGrupalActaSeries(organizer: ActividadGrupalOrganizer): boolean {
  return (
    organizer === "medico" ||
    organizer === "enfermeria" ||
    organizer === "psicologa" ||
    organizer === "trabajadora_social"
  );
}

export function formatActividadGrupalActaNumber(
  organizer: ActividadGrupalOrganizer,
  sequence: number,
): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("La secuencia del acta debe ser un entero positivo.");
  }

  const actaOrganizer = resolveActividadGrupalActaOrganizer(organizer);

  return `${ACTIVIDAD_GRUPAL_ACTA_PREFIX[actaOrganizer]}-${String(sequence).padStart(3, "0")}`;
}

export function findNextAvailableActividadGrupalActaSequence(
  usedSequences: Iterable<number>,
): number {
  const used = new Set(usedSequences);
  const highestUsedSequence = Math.max(0, ...used);

  for (let sequence = highestUsedSequence - 1; sequence >= 1; sequence -= 1) {
    if (!used.has(sequence)) {
      return sequence;
    }
  }

  return highestUsedSequence + 1;
}
