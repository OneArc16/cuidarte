import { buildActividadGrupalActaPdfUrl } from "../api/actividades-grupales-api";

export function openActividadGrupalActaPdf(activityId: string): void {
  const pdfUrl = buildActividadGrupalActaPdfUrl(activityId);
  window.open(pdfUrl, "_blank", "noopener,noreferrer");
}
