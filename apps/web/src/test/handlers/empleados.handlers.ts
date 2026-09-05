import { http, HttpResponse } from "msw";

import { backofficeTenantDetailFixture, empleadoFixture } from "../fixtures";

export const empleadosHandlers = [
  http.get("http://localhost:3001/api/empleados", () =>
    HttpResponse.json({ empleados: [empleadoFixture] }),
  ),
  http.get("http://localhost:3001/api/empleados/tenant-options", () =>
    HttpResponse.json({ tenants: [backofficeTenantDetailFixture.tenant] }),
  ),
  http.get("http://localhost:3001/api/empleados/:empleadoId", () =>
    HttpResponse.json(empleadoFixture),
  ),
  http.post("http://localhost:3001/api/empleados", () => HttpResponse.json(empleadoFixture)),
  http.patch("http://localhost:3001/api/empleados/:empleadoId", () =>
    HttpResponse.json(empleadoFixture),
  ),
  http.get("http://localhost:3001/api/tenants/:tenantId/active-signer", () =>
    HttpResponse.json({ activeSigner: null }),
  ),
  http.put("http://localhost:3001/api/tenants/:tenantId/active-signer", () =>
    HttpResponse.json({
      activeSigner: {
        tenantId: backofficeTenantDetailFixture.tenant.id,
        employeeId: empleadoFixture.id,
        signatureVersionId: "dc8e2c42-8f96-4f19-b204-adf90e139bf4",
        activatedByUserId: backofficeTenantDetailFixture.owner.id,
        activatedAt: "2026-08-09T12:00:00.000Z",
        updatedAt: "2026-08-09T12:00:00.000Z",
      },
    }),
  ),
] as const;
