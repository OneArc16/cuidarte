import { http, HttpResponse } from "msw";

import { adultoMayorFixture, backofficeTenantDetailFixture } from "../fixtures";

export const adultosMayoresHandlers = [
  http.get("http://localhost:3001/api/adultos-mayores", ({ request }) => {
    const search = new URL(request.url).searchParams.get("search");

    if (search === "sin-resultados") {
      return HttpResponse.json({ adultosMayores: [], page: 1, pageSize: 20, total: 0 });
    }

    return HttpResponse.json({
      adultosMayores: [adultoMayorFixture],
      page: 1,
      pageSize: 20,
      total: 1,
    });
  }),
  http.get("http://localhost:3001/api/adultos-mayores/tenant-options", () =>
    HttpResponse.json({ tenants: [backofficeTenantDetailFixture.tenant] }),
  ),
  http.get("http://localhost:3001/api/adultos-mayores/trash", () =>
    HttpResponse.json({
      adultosMayores: [
        {
          ...adultoMayorFixture,
          deletedAt: "2026-09-12T12:00:00.000Z",
          deletedByUserId: "4c5b84e6-d88e-4f8a-93de-af2916d62f40",
          deletedByUserFullName: "Super Admin CuidarTe",
          deletionReason: "Registro duplicado",
        },
      ],
    }),
  ),
  http.delete("http://localhost:3001/api/adultos-mayores/:adultoMayorId", () =>
    HttpResponse.json({ success: true }),
  ),
  http.post("http://localhost:3001/api/adultos-mayores/:adultoMayorId/restore", () =>
    HttpResponse.json({ success: true }),
  ),
  http.get("http://localhost:3001/api/adultos-mayores/:adultoMayorId/periodos-programa", () =>
    HttpResponse.json({
      programStatus: "active",
      periods: [
        {
          id: "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d",
          activationDate: "2026-07-15",
          inactivationDate: null,
          activationReason: null,
          inactivationReason: null,
          activatedByUserFullName: null,
          inactivatedByUserFullName: null,
        },
      ],
    }),
  ),
  http.get("http://localhost:3001/api/adultos-mayores/:adultoMayorId", () =>
    HttpResponse.json(adultoMayorFixture),
  ),
  http.post("http://localhost:3001/api/adultos-mayores", () =>
    HttpResponse.json(adultoMayorFixture),
  ),
  http.patch("http://localhost:3001/api/adultos-mayores/:adultoMayorId", () =>
    HttpResponse.json(adultoMayorFixture),
  ),
  http.get(
    "http://localhost:3001/api/adultos-mayores/export/excel",
    () =>
      new HttpResponse("excel", {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      }),
  ),
  http.get(
    "http://localhost:3001/api/adultos-mayores/export/pdf",
    () =>
      new HttpResponse("pdf", {
        headers: {
          "Content-Type": "application/pdf",
        },
      }),
  ),
] as const;
