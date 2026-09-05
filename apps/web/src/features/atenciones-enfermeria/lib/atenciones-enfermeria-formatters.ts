import {
  type AtencionEnfermeriaCareType,
  type AtencionEnfermeriaGlucometriaContext,
  type AtencionEnfermeriaHistoryAccess,
} from "@cuidarte/contracts";

import { ApiError } from "@/shared/api/api-error";
import { formatRole } from "@/features/home/lib/home-formatters";

export const ATENCIONES_ENFERMERIA_CARE_TYPE_LABELS: Record<AtencionEnfermeriaCareType, string> = {
  control_signos_vitales: "Control de signos vitales",
  seguimiento: "Seguimiento",
  procedimiento: "Procedimiento",
  otro: "Otro",
};

export const ATENCIONES_ENFERMERIA_GLUCOMETRIA_CONTEXT_LABELS: Record<
  AtencionEnfermeriaGlucometriaContext,
  string
> = {
  ayunas: "Ayunas",
  antes_de_comida: "Antes de comida",
  despues_de_comida: "Despues de comida",
  aleatoria: "Aleatoria",
};

const ACCESS_LABELS: Record<AtencionEnfermeriaHistoryAccess, string> = {
  edit: "Editar",
  view: "Ver",
};

export function formatAtencionEnfermeriaCareType(value: AtencionEnfermeriaCareType): string {
  return ATENCIONES_ENFERMERIA_CARE_TYPE_LABELS[value];
}

export function formatAtencionEnfermeriaGlucometria(value: {
  glucometriaMgDl: number | null;
  glucometriaContext: AtencionEnfermeriaGlucometriaContext | null;
}): string {
  if (value.glucometriaMgDl === null) {
    return "Sin glucometría";
  }

  const contextLabel =
    value.glucometriaContext === null
      ? "Sin contexto"
      : ATENCIONES_ENFERMERIA_GLUCOMETRIA_CONTEXT_LABELS[value.glucometriaContext];

  return `${value.glucometriaMgDl} mg/dL · ${contextLabel}`;
}

export function formatAtencionEnfermeriaTimestamp(attentionDate: string, attentionTime: string): string {
  const formattedDate = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${attentionDate}T00:00:00.000Z`));

  return `${formattedDate} · ${attentionTime}`;
}

export function formatAtencionEnfermeriaAccess(access: AtencionEnfermeriaHistoryAccess): string {
  return ACCESS_LABELS[access];
}

export function formatAtencionEnfermeriaProfessionalRole(
  role: Parameters<typeof formatRole>[0],
): string {
  return formatRole(role);
}

export function resolveAtencionesEnfermeriaApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "No fue posible consultar las atenciones de enfermería.";
}
