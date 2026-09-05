import { type NamedOption } from "@/shared/lib/named-options";

import { preserveHistoricCatalogOption } from "./catalog-options";

export const DISABILITY_OPTIONS = [
  { id: "Discapacidad física", name: "Discapacidad física" },
  { id: "Discapacidad visual", name: "Discapacidad visual" },
  { id: "Discapacidad auditiva", name: "Discapacidad auditiva" },
  { id: "Discapacidad intelectual", name: "Discapacidad intelectual" },
  { id: "Discapacidad sicosocial (mental)", name: "Discapacidad sicosocial (mental)" },
  { id: "Sordoceguera", name: "Sordoceguera" },
  { id: "Discapacidad múltiple", name: "Discapacidad múltiple" },
  { id: "Sin discapacidad", name: "Sin discapacidad" },
] as const satisfies readonly NamedOption[];

export function buildDisabilityOptions(currentDisability: string | null): readonly NamedOption[] {
  return preserveHistoricCatalogOption(DISABILITY_OPTIONS, currentDisability);
}
