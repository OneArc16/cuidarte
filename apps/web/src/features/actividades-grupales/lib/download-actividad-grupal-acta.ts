import { type ActividadGrupalListItem } from "@cuidarte/contracts";

import { downloadBlob } from "@/features/adultos-mayores/lib/download-file";

import {
  formatActividadGrupalOrganizer,
  formatActividadGrupalType,
  formatActivitySchedule,
  formatActaNumber,
} from "./actividades-grupales-formatters";

export function downloadActividadGrupalActa(actividad: ActividadGrupalListItem): void {
  const content = [
    `ACTA ${formatActaNumber(actividad.actaNumber)}`,
    "",
    `Actividad: ${actividad.activityName}`,
    `Tipo: ${formatActividadGrupalType(actividad.activityType)}`,
    `Fecha: ${actividad.activityDate}`,
    `Horario: ${formatActivitySchedule(actividad.startTime, actividad.endTime)}`,
    `Organizador: ${formatActividadGrupalOrganizer(actividad.organizer)}`,
    `Centro: ${actividad.tenantName}`,
  ].join("\n");

  downloadBlob(
    new Blob([content], { type: "text/plain;charset=utf-8" }),
    `acta-${formatActaNumber(actividad.actaNumber)}.txt`,
  );
}
