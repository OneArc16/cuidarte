import { type NamedOption } from "@/shared/lib/named-options";

import { preserveHistoricCatalogOption } from "./catalog-options";

export const HEALTH_REGIME_OPTIONS = [
  { id: "special", name: "Especial o Excepción cotizante" },
  { id: "uninsured", name: "No afiliado" },
  { id: "subsidized", name: "Subsidiado" },
  { id: "contributory-additional", name: "Contributivo adicional" },
  { id: "contributory-beneficiary", name: "Contributivo beneficiario" },
  { id: "contributory", name: "Contributivo cotizante" },
  { id: "exception", name: "Especial o Excepción beneficiario" },
  { id: "arl-protected", name: "Tomador / Amparado ARL" },
  { id: "soat-protected", name: "Tomador / Amparado SOAT" },
  {
    id: "voluntary-health-plans",
    name: "Tomador / Amparado Planes voluntarios de salud",
  },
  { id: "particular", name: "Particular" },
  {
    id: "prisoners-covered-by-national-health-fund",
    name: "Personas privadas de la libertad a cargo del Fondo Nacional de Salud",
  },
] as const satisfies readonly NamedOption[];

const HEALTH_REGIME_FORM_VALUE_ALIASES: Record<string, string> = {
  "Contributivo cotizante": "contributory",
  "Contributivo adicional": "contributory-additional",
  "Contributivo beneficiario": "contributory-beneficiary",
  "Subsidiado": "subsidized",
  "Especial o Excepción cotizante": "special",
  "Especial o Excepción beneficiario": "exception",
  "No afiliado": "uninsured",
  "Tomador / Amparado ARL": "arl-protected",
  "Tomador / Amparado SOAT": "soat-protected",
  "Tomador / Amparado Planes voluntarios de salud": "voluntary-health-plans",
  "Particular": "particular",
  "Personas privadas de la libertad a cargo del Fondo Nacional de Salud":
    "prisoners-covered-by-national-health-fund",
  Ninguno: "unknown",
  subsidized: "subsidized",
  contributory: "contributory",
  "contributory-additional": "contributory-additional",
  "contributory-beneficiary": "contributory-beneficiary",
  special: "special",
  exception: "exception",
  uninsured: "uninsured",
  "arl-protected": "arl-protected",
  "soat-protected": "soat-protected",
  "voluntary-health-plans": "voluntary-health-plans",
  particular: "particular",
  "prisoners-covered-by-national-health-fund": "prisoners-covered-by-national-health-fund",
  unknown: "unknown",
};

export function buildHealthRegimeOptions(currentHealthRegime: string | null): readonly NamedOption[] {
  if (currentHealthRegime === null) {
    return HEALTH_REGIME_OPTIONS;
  }

  const formValue = resolveHealthRegimeFormValue(currentHealthRegime);

  return preserveHistoricCatalogOption(HEALTH_REGIME_OPTIONS, formValue);
}

export function resolveHealthRegimeFormValue(value: string | null): string {
  if (value === null) {
    return "";
  }

  return HEALTH_REGIME_FORM_VALUE_ALIASES[value] ?? value;
}
