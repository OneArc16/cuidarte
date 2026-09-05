export const departmentFixture = {
  id: "11111111-1111-1111-8111-111111111111",
  name: "Cundinamarca",
} as const;

export const municipalityFixture = {
  id: "22222222-2222-2222-8222-222222222222",
  departmentId: departmentFixture.id,
  name: "Bogota",
} as const;
