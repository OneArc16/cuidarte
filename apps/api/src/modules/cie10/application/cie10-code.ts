export function normalizeCie10Code(value: string): string {
  const compactValue = value.trim().toUpperCase().replaceAll(/\s+/g, "").replaceAll(".", "");

  if (compactValue.length <= 3) {
    return compactValue;
  }

  return `${compactValue.slice(0, 3)}.${compactValue.slice(3)}`;
}
