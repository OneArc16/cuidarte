import { type NamedOption } from "@/shared/lib/named-options";

import { preserveHistoricCatalogOption } from "./catalog-options";

export const POPULATION_GROUP_OPTIONS = [
  { id: "Indigena", name: "Indigena" },
  { id: "ROM (gitano)", name: "ROM (gitano)" },
  {
    id: "Raizal (archipiélago de San Andrés y Providencia)",
    name: "Raizal (archipiélago de San Andrés y Providencia)",
  },
  { id: "Palenquero de San Basilio", name: "Palenquero de San Basilio" },
  {
    id: "Negro(a), Mulato(a), Afrocolombiano(a) o Afro",
    name: "Negro(a), Mulato(a), Afrocolombiano(a) o Afro",
  },
  { id: "Ninguna de las anteriores", name: "Ninguna de las anteriores" },
] as const satisfies readonly NamedOption[];

export function buildPopulationGroupOptions(
  currentPopulationGroup: string | null,
): readonly NamedOption[] {
  return preserveHistoricCatalogOption(POPULATION_GROUP_OPTIONS, currentPopulationGroup);
}
