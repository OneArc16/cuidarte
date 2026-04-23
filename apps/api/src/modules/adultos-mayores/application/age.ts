export function calculateAgeFromBirthDate(birthDate: string, now = new Date()): number {
  const birth = new Date(`${birthDate}T00:00:00.000Z`);
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  const hasBirthdayPassed =
    monthDiff > 0 || (monthDiff === 0 && now.getUTCDate() >= birth.getUTCDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return Math.max(age, 0);
}
