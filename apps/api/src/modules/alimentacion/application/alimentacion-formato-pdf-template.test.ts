import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildFormatoEntregaPdfFilename,
  buildFormatoEntregaPdfHtml,
} from "./alimentacion-formato-pdf-template";

describe("alimentacion-formato-pdf-template", () => {
  it("builds duplicated stubs by 12-day blocks and maps status marks", () => {
    const html = buildFormatoEntregaPdfHtml({
      data: {
        tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
        tenantName: "Centro de Vida Demo",
        tenantCity: "El Banco",
        tenantDepartment: "Magdalena",
        adultoMayorId: "0b17e370-8f81-48c0-b707-c7046f497855",
        documentNumber: "1020304050",
        fullName: "Rosa Elena Martinez Rojas",
        deliveryMonth: "2026-04",
        records: [
          {
            deliveryDate: "2026-04-01",
            organizer: "nutricionista",
            refrigerio1: "entregado",
            almuerzo: "no_entregado",
            refrigerio2: "no_aplica",
            auxilioTransporte: "entregado",
          },
          {
            deliveryDate: "2026-04-13",
            organizer: "director",
            refrigerio1: "entregado",
            almuerzo: "entregado",
            refrigerio2: "entregado",
            auxilioTransporte: "entregado",
          },
          {
            deliveryDate: "2026-04-25",
            organizer: "director",
            refrigerio1: "no_aplica",
            almuerzo: "entregado",
            refrigerio2: "no_entregado",
            auxilioTransporte: "entregado",
          },
        ],
      },
      generatedAt: new Date("2026-04-30T15:00:00.000Z"),
      logoDataUrl: null,
    });

    assert.equal(
      (html.match(/Formato de Entrega de Alimentos y Auxilio de Transporte/g) ?? []).length,
      6,
    );
    assert.match(html, /EL BANCO - MAGDALENA/);
    assert.match(html, /Dia<br>1/);
    assert.match(html, /Dia<br>12/);
    assert.match(html, /Dia<br>13/);
    assert.match(html, /Dia<br>24/);
    assert.match(html, /Dia<br>25/);
    assert.match(html, /Dia<br>30/);
    assert.ok(!html.includes("Dia<br>31"));
    assert.match(html, />X</);
    assert.match(html, />N\/A</);
  });

  it("uses city fallback when city and department are missing", () => {
    const html = buildFormatoEntregaPdfHtml({
      data: {
        tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
        tenantName: "Centro de Vida Demo",
        tenantCity: null,
        tenantDepartment: null,
        adultoMayorId: "0b17e370-8f81-48c0-b707-c7046f497855",
        documentNumber: "1020304050",
        fullName: "Rosa Elena Martinez Rojas",
        deliveryMonth: "2026-02",
        records: [],
      },
      generatedAt: new Date("2026-02-01T15:00:00.000Z"),
      logoDataUrl: null,
    });

    assert.match(html, /CIUDAD NO CONFIGURADA/);
  });

  it("builds a sanitized filename", () => {
    assert.equal(
      buildFormatoEntregaPdfFilename("10 20/30", "2026-04"),
      "formato-entrega-10-20-30-2026-04.pdf",
    );
  });
});
