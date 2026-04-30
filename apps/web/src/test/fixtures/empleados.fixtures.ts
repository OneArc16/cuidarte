import { backofficeTenantDetailFixture } from "./backoffice.fixtures";

export const empleadoFixture = {
  id: "aeeb7b27-2c8d-48ce-b2f8-3397d34a6e72",
  tenantId: backofficeTenantDetailFixture.tenant.id,
  tenantName: backofficeTenantDetailFixture.tenant.name,
  documentNumber: "1010101010",
  fullName: "Laura Natalia Perez Ruiz",
  firstName: "Laura",
  middleName: "Natalia",
  firstSurname: "Perez",
  secondSurname: "Ruiz",
  email: "laura.perez@centro-demo.test",
  phone: "3105551212",
  role: "medico",
  isActive: true,
  createdAt: "2026-04-21T12:00:00.000Z",
  updatedAt: "2026-04-21T12:00:00.000Z",
} as const;
