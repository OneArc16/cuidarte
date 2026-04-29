import {
  type AtencionDiagnosticoTipo,
  type AtencionIndividualCausaExterna,
  type AtencionIndividualFinalidad,
  type AtencionIndividualHistoryAccess,
  type AtencionIndividualModalidad,
  type AtencionIndividualTipoConsulta,
  type AtencionOrdenTipo,
} from "@cuidarte/contracts";

import { ApiError } from "@/shared/api/api-error";

export const MODALIDAD_LABELS: Record<AtencionIndividualModalidad, string> = {
  intramural: "Intramural",
  extramural_domiciliaria: "Extramural Domiciliaria",
  extramural_jornada_movil: "Extramural Jornada Movil",
  telemedicina: "Telemedicina",
};

export const TIPO_CONSULTA_LABELS: Record<AtencionIndividualTipoConsulta, string> = {
  primera_vez: "Primera Vez",
  control: "Control",
  urgencia: "Urgencia",
  otro: "Otro",
};

export const FINALIDAD_LABELS: Record<AtencionIndividualFinalidad, string> = {
  resolutiva_atencion_general: "Resolutiva / Atencion General del Paciente",
  deteccion_alteraciones_adulto: "Deteccion de alteraciones del adulto",
  seguimiento: "Seguimiento",
};

export const CAUSA_EXTERNA_LABELS: Record<AtencionIndividualCausaExterna, string> = {
  accidente_trabajo: "Accidente de trabajo",
  accidente_transito: "Accidente de transito",
  accidente_rabico: "Accidente rabico",
  accidente_ofidico: "Accidente ofidico",
  otro_tipo_accidente: "Otro tipo de accidente",
  evento_catastrofico: "Evento catastrofico",
  lesion_agresion: "Lesion por agresion",
  lesion_auto_infligida: "Lesion auto infligida",
  sospecha_maltrato_fisico: "Sospecha de maltrato fisico",
  sospecha_abuso_sexual: "Sospecha de abuso sexual",
  sospecha_maltrato_emocional: "Sospecha de maltrato emocional",
  enfermedad_general: "Enfermedad General",
  enfermedad_laboral: "Enfermedad laboral",
  otra: "Otra",
};

export const ORDEN_TIPO_LABELS: Record<AtencionOrdenTipo, string> = {
  laboratorio: "Laboratorio",
  medicamento: "Medicamento",
  incapacidad: "Incapacidad",
  insumo: "Insumo",
};

export const DIAGNOSTICO_TIPO_LABELS: Record<AtencionDiagnosticoTipo, string> = {
  principal: "Principal",
  relacionado: "Relacionado",
  impresion_diagnostica: "Impresion diagnostica",
};

const HISTORY_ACTION_LABELS: Record<AtencionIndividualHistoryAccess, string> = {
  edit: "Editar",
  view: "Ver",
};

export function formatAtencionHistoryAction(access: AtencionIndividualHistoryAccess): string {
  return HISTORY_ACTION_LABELS[access];
}

export function formatAtencionHistoryDate(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function resolveAtencionIndividualApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "No fue posible guardar la atencion individual. Intenta nuevamente.";
}
