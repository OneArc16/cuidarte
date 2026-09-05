export type NamedOption = {
  id: string;
  name: string;
};

export function getNamedOptionLabel(option: NamedOption): string {
  return option.name;
}

export function findNamedOptionByName<TOption extends NamedOption>(
  options: readonly TOption[],
  expectedName: string | null,
): TOption | null {
  if (expectedName === null) {
    return null;
  }

  const normalizedExpectedName = normalizeComparableName(expectedName);

  return (
    options.find((option) => normalizeComparableName(option.name) === normalizedExpectedName) ??
    null
  );
}

function normalizeComparableName(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CO")
    .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}
