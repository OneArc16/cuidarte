import { type NamedOption, findNamedOptionByName } from "@/shared/lib/named-options";

export function preserveHistoricCatalogOption(
  options: readonly NamedOption[],
  currentValue: string | null,
): readonly NamedOption[] {
  if (currentValue === null || currentValue.trim() === "") {
    return options;
  }

  const existingOption = findNamedOptionByName(options, currentValue);
  const existingOptionById = options.find((option) => option.id === currentValue);

  if (existingOption !== null || existingOptionById !== undefined) {
    return options;
  }

  return [{ id: currentValue, name: currentValue }, ...options];
}
