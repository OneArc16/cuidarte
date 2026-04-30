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
] as const;
