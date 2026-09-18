import { type ActividadGrupalOrganizer } from "@cuidarte/contracts";

export const ACTIVIDAD_GRUPAL_ACTA_PREFIX: Record<ActividadGrupalOrganizer, string> = {
  director: "DIREC",
  medico: "MED",
  enfermeria: "ENFER",
  psicologa: "PSICO",
  trabajadora_social: "TSOC",
  nutricionista: "NUTRI",
  fisioterapeuta: "FISIO",
  recreacionista: "RECRE",
};

export function formatActividadGrupalActaNumber(
  organizer: ActividadGrupalOrganizer,
  sequence: number,
): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("La secuencia del acta debe ser un entero positivo.");
  }

  return `${ACTIVIDAD_GRUPAL_ACTA_PREFIX[organizer]}-${String(sequence).padStart(3, "0")}`;
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
