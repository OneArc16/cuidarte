import { http, HttpResponse } from "msw";

import {
  alimentacionAdultoOptionFixture,
  alimentacionFixture,
  backofficeTenantDetailFixture,
} from "../fixtures";

type AlimentacionPatchPayload = Partial<{
  deliveryDate: string;
  organizer: string;
  refrigerio1: string;
  almuerzo: string;
  refrigerio2: string;
  auxilioTransporte: string;
}>;

export const alimentacionHandlers = [
  http.get("http://localhost:3001/api/registro-alimentacion", ({ request }) => {
    const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? null;
    const deliveryMonth = new URL(request.url).searchParams.get("deliveryMonth");
    const registros = [alimentacionFixture].filter((registro) => {
      const matchesSearch =
        search === null ||
        [registro.documentNumber, registro.fullName, registro.organizer]
          .join(" ")
          .toLowerCase()
          .includes(search);
      const matchesMonth =
        deliveryMonth === null ||
        deliveryMonth === "" ||
        registro.deliveryDate.startsWith(`${deliveryMonth}-`);

      return matchesSearch && matchesMonth;
    });

    return HttpResponse.json({ registros });
  }),
  http.get("http://localhost:3001/api/registro-alimentacion/tenant-options", () =>
    HttpResponse.json({ tenants: [backofficeTenantDetailFixture.tenant] }),
  ),
  http.get(
    "http://localhost:3001/api/registro-alimentacion/adultos-mayores-options",
    ({ request }) => {
      const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? "";

      const adultosMayores = [alimentacionAdultoOptionFixture].filter((adultoMayor) =>
        [adultoMayor.documentNumber, adultoMayor.fullName].join(" ").toLowerCase().includes(search),
      );

      return HttpResponse.json({ adultosMayores });
    },
  ),
  http.get(
    "http://localhost:3001/api/registro-alimentacion/adultos-mayores/:adultoMayorId/lookup",
    () =>
      HttpResponse.json({
        adultoMayor: alimentacionAdultoOptionFixture,
        existingRecordId: null,
      }),
  ),
  http.get(
    "http://localhost:3001/api/registro-alimentacion/adultos-mayores/:adultoMayorId/formato-entrega/pdf",
    () =>
      new HttpResponse(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
        headers: {
          "Content-Type": "application/pdf",
        },
      }),
  ),
  http.post("http://localhost:3001/api/registro-alimentacion", async ({ request }) => {
    const payload = (await request.json()) as { registros?: unknown[] };

    return HttpResponse.json({
      createdCount: Array.isArray(payload.registros) ? payload.registros.length : 1,
    });
  }),
  http.get("http://localhost:3001/api/registro-alimentacion/:recordId", () =>
    HttpResponse.json(alimentacionFixture),
  ),
  http.patch("http://localhost:3001/api/registro-alimentacion/:recordId", async ({ request }) => {
    const payload = (await request.json()) as AlimentacionPatchPayload;

    return HttpResponse.json({
      ...alimentacionFixture,
      deliveryDate: payload.deliveryDate ?? alimentacionFixture.deliveryDate,
      organizer: payload.organizer ?? alimentacionFixture.organizer,
      refrigerio1: payload.refrigerio1 ?? alimentacionFixture.refrigerio1,
      almuerzo: payload.almuerzo ?? alimentacionFixture.almuerzo,
      refrigerio2: payload.refrigerio2 ?? alimentacionFixture.refrigerio2,
      auxilioTransporte: payload.auxilioTransporte ?? alimentacionFixture.auxilioTransporte,
      updatedAt: "2026-04-25T12:00:00.000Z",
    });
  }),
] as const;
