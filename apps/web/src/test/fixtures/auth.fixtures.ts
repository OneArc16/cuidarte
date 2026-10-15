export const authUserFixture = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  tenantMunicipality: "Bogota",
  tenantDepartment: "Cundinamarca",
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
  passwordSetByAdmin: true,
} as const;

export const superAdminUserFixture = {
  ...authUserFixture,
  id: "4c5b84e6-d88e-4f8a-93de-af2916d62f40",
  tenantId: null,
  tenantMunicipality: null,
  tenantDepartment: null,
  email: "superadmin@cuidarte.test",
  fullName: "Super Admin CuidarTe",
  role: "super_admin",
} as const;

export const auditorUserFixture = {
  ...authUserFixture,
  id: "6f41f9cb-b7bc-4d4b-a9d9-020ea028f787",
  email: "auditor@centro-demo.test",
  fullName: "Auditor Centro Demo",
  role: "auditor",
} as const;

export const medicoUserFixture = {
  ...authUserFixture,
  email: "medico@centro-demo.test",
  fullName: "Medico Centro Demo",
  role: "medico",
} as const;

export const directorUserFixture = {
  ...authUserFixture,
  email: "director@centro-demo.test",
  fullName: "Director Centro Demo",
  role: "director",
} as const;

export const enfermeriaUserFixture = {
  ...authUserFixture,
  id: "bdeba5d1-ef43-4e7d-8c53-9b86c0dc9d53",
  email: "enfermeria@centro-demo.test",
  fullName: "Enfermera Centro Demo",
  role: "enfermeria",
} as const;

export const enfermeriaApoyoUserFixture = {
  ...authUserFixture,
  id: "8e70f3b0-1d7f-4c67-9c8e-32f6c3d7e9a1",
  email: "enfermeria.apoyo@centro-demo.test",
  fullName: "Enfermera de Apoyo",
  role: "enfermeria",
} as const;

export const recreacionistaUserFixture = {
  ...authUserFixture,
  email: "recreacion@centro-demo.test",
  fullName: "Recreacionista Centro Demo",
  role: "recreacionista",
} as const;

export const psicologoUserFixture = {
  ...authUserFixture,
  id: "0d516183-3e18-40ba-90d0-f4e2e978bb9a",
  email: "psicologo@centro-demo.test",
  fullName: "Psicologo Centro Demo",
  role: "psicologo",
} as const;
