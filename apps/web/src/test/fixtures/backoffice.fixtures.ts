import { departmentFixture, municipalityFixture } from "./ubicaciones.fixtures";

export const backofficeTenantDetailFixture = {
  tenant: {
    id: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
    documentType: "nit",
    documentNumber: "900123456",
    name: "Centro de Vida Demo",
    email: "contacto@centro-demo.test",
    phone: "6015550101",
    address: "Calle 10 # 20-30",
    departmentId: departmentFixture.id,
    municipalityId: municipalityFixture.id,
    city: "Bogota",
    department: "Cundinamarca",
    isActive: true,
    createdAt: "2026-04-21T12:00:00.000Z",
    updatedAt: "2026-04-21T12:00:00.000Z",
  },
  owner: {
    id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
    tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
    email: "admin@centro-demo.test",
    fullName: "Admin Centro Demo",
    isActive: true,
    createdAt: "2026-04-21T12:00:00.000Z",
    updatedAt: "2026-04-21T12:00:00.000Z",
  },
  activeSigner: null,
  logo: null,
} as const;
