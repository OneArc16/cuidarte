export function calculateImc(weightKgText: string, heightCmText: string): number | null {
  const weightKg = parseOptionalNumber(weightKgText);
  const heightCm = parseOptionalNumber(heightCmText);

  if (weightKg === null || heightCm === null || heightCm <= 0) {
    return null;
  }

  const heightMeters = heightCm / 100;
  const bmi = weightKg / (heightMeters * heightMeters);

  if (!Number.isFinite(bmi) || bmi <= 0) {
    return null;
  }

  return Number(bmi.toFixed(2));
}

export function formatImcInput(weightKgText: string, heightCmText: string): string {
  const bmi = calculateImc(weightKgText, heightCmText);

  return bmi === null ? "" : bmi.toFixed(2);
}

function parseOptionalNumber(value: string): number | null {
  const trimmedValue = value.trim();

  return trimmedValue === "" ? null : Number(trimmedValue);
}
