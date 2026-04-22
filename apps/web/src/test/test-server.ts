import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const authUserFixture = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "tenant_admin",
  passwordSetByAdmin: true,
} as const;

export const superAdminUserFixture = {
  ...authUserFixture,
  id: "4c5b84e6-d88e-4f8a-93de-af2916d62f40",
  tenantId: null,
  email: "superadmin@cuidarte.test",
  fullName: "Super Admin CuidarTe",
  role: "super_admin",
} as const;

export const backofficeTenantDetailFixture = {
  tenant: {
    id: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
    documentType: "nit",
    documentNumber: "900123456",
    name: "Centro de Vida Demo",
    email: "contacto@centro-demo.test",
    phone: "6015550101",
    address: "Calle 10 # 20-30",
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
} as const;

export const server = setupServer(
  http.get("http://localhost:3001/api/health", () =>
    HttpResponse.json({
      service: "cuidarte-api",
      status: "ok",
      timestamp: "2026-04-21T12:00:00.000Z",
    }),
  ),
  http.get("http://localhost:3001/api/auth/me", () => HttpResponse.json({ user: null })),
  http.post("http://localhost:3001/api/auth/login", () =>
    HttpResponse.json({ user: authUserFixture }),
  ),
  http.post("http://localhost:3001/api/auth/logout", () => HttpResponse.json({ success: true })),
  http.get("http://localhost:3001/api/backoffice/tenants", () =>
    HttpResponse.json({ tenants: [backofficeTenantDetailFixture] }),
  ),
  http.get("http://localhost:3001/api/backoffice/tenants/:tenantId", () =>
    HttpResponse.json(backofficeTenantDetailFixture),
  ),
  http.post("http://localhost:3001/api/backoffice/tenants", () =>
    HttpResponse.json(backofficeTenantDetailFixture),
  ),
  http.patch("http://localhost:3001/api/backoffice/tenants/:tenantId", () =>
    HttpResponse.json(backofficeTenantDetailFixture),
  ),
);
