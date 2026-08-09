import { type NamedOption } from "@/shared/lib/named-options";

import { preserveHistoricCatalogOption } from "./catalog-options";

export const EDUCATION_LEVEL_OPTIONS = [
  { id: "Preescolar", name: "Preescolar" },
  { id: "Básica Primaria", name: "Básica Primaria" },
  { id: "Básica Secundaria", name: "Básica Secundaria" },
  { id: "Media Académica", name: "Media Académica" },
  { id: "Media Técnica", name: "Media Técnica" },
  { id: "Normalista", name: "Normalista" },
  { id: "Técnico Profesional", name: "Técnico Profesional" },
  { id: "Tecnológica", name: "Tecnológica" },
  { id: "Profesional", name: "Profesional" },
  { id: "Especialización", name: "Especialización" },
  { id: "Maestría", name: "Maestría" },
  { id: "Doctorado", name: "Doctorado" },
  { id: "Ninguno", name: "Ninguno" },
] as const satisfies readonly NamedOption[];

export function buildEducationLevelOptions(
  currentEducationLevel: string | null,
): readonly NamedOption[] {
  return preserveHistoricCatalogOption(EDUCATION_LEVEL_OPTIONS, currentEducationLevel);
}
