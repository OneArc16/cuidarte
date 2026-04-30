import { http, HttpResponse } from "msw";

import { backofficeTenantDetailFixture } from "../fixtures";

export const backofficeHandlers = [
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
] as const;
