import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildFormatoEntregaPdfFilename,
  buildFormatoEntregaPdfHtml,
} from "./alimentacion-formato-pdf-template";

describe("alimentacion-formato-pdf-template", () => {
  it("renders two visual stubs and fills visit marks sequentially", () => {
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
            updatedAt: new Date("2026-04-01T12:00:00.000Z"),
          },
          {
            deliveryDate: "2026-04-13",
            organizer: "director",
            refrigerio1: "entregado",
            almuerzo: "entregado",
            refrigerio2: "entregado",
            auxilioTransporte: "entregado",
            updatedAt: new Date("2026-04-13T12:00:00.000Z"),
          },
          {
            deliveryDate: "2026-04-25",
            organizer: "director",
            refrigerio1: "no_aplica",
            almuerzo: "entregado",
            refrigerio2: "no_entregado",
            auxilioTransporte: "entregado",
            updatedAt: new Date("2026-04-25T12:00:00.000Z"),
          },
        ],
      },
      generatedAt: new Date("2026-04-30T15:00:00.000Z"),
      institutionalLogoDataUrl: null,
      tenantLogoDataUrl: "data:image/png;base64,bG9nbw==",
      directorSignatureDataUrl: "data:image/png;base64,ZmlybWE=",
    });

    assert.equal(
      (html.match(/Formato de Entrega de Alimentos y Auxilio de Transporte/g) ?? []).length,
      3,
    );
    assert.match(html, /EL BANCO - MAGDALENA/);
    assert.equal((html.match(/>Dia<br>1<\/th>/g) ?? []).length, 2);
    assert.equal((html.match(/>Dia<br>12<\/th>/g) ?? []).length, 2);
    assert.ok(!html.includes("Dia<br>13"));
    assert.ok(!html.includes("Dia<br>24"));
    assert.ok(!html.includes("Dia<br>25"));
    assert.equal((html.match(/data-block-index="/g) ?? []).length, 2);
    assert.equal((html.match(/>X</g) ?? []).length, 8);
    assert.ok(!html.includes(">N/A<"));
    assert.match(html, /data:image\/png;base64,ZmlybWE=/);
    assert.match(html, /alt="Logo de Centro de Vida Demo"/);
    assert.match(html, /stub-logo--institutional/);
    assert.match(html, /stub-logo--tenant/);
  });

  it("uses the lower stub for visits 13 to 24 without changing the visual day labels", () => {
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
        records: Array.from({ length: 13 }, (_, index) => ({
          deliveryDate: `2026-04-${String(index + 1).padStart(2, "0")}`,
          organizer: "director" as const,
          refrigerio1: index === 12 ? "entregado" : "no_entregado",
          almuerzo: index === 12 ? "entregado" : "no_entregado",
          refrigerio2: index === 12 ? "entregado" : "no_entregado",
          auxilioTransporte: index === 12 ? "entregado" : "no_entregado",
          updatedAt: new Date(`2026-04-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`),
        })),
      },
      generatedAt: new Date("2026-04-30T15:00:00.000Z"),
      institutionalLogoDataUrl: null,
      tenantLogoDataUrl: "data:image/png;base64,bG9nbw==",
      directorSignatureDataUrl: "data:image/png;base64,ZmlybWE=",
    });

    assert.equal((html.match(/>X</g) ?? []).length, 4);
    assert.equal((html.match(/>Dia<br>1<\/th>/g) ?? []).length, 2);
    assert.ok(!html.includes("Dia<br>13"));
  });

  it("uses city fallback when city and department are missing", () => {
    const html = buildFormatoEntregaPdfHtml({
      data: {
        tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
        tenantName: 'Centro <Vida> "Norte"',
        tenantCity: null,
        tenantDepartment: null,
        adultoMayorId: "0b17e370-8f81-48c0-b707-c7046f497855",
        documentNumber: "1020304050",
        fullName: "Rosa Elena Martinez Rojas",
        deliveryMonth: "2026-02",
        records: [],
      },
      generatedAt: new Date("2026-02-01T15:00:00.000Z"),
      institutionalLogoDataUrl: null,
      tenantLogoDataUrl: "data:image/png;base64,bG9nbw==",
      directorSignatureDataUrl: "data:image/png;base64,ZmlybWE=",
    });

    assert.match(html, /CIUDAD NO CONFIGURADA/);
    assert.match(html, /alt="Logo de Centro &lt;Vida&gt; &quot;Norte&quot;"/);
  });

  it("omits the director signature image when it is unavailable", () => {
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
        records: [],
      },
      generatedAt: new Date("2026-04-30T15:00:00.000Z"),
      institutionalLogoDataUrl: null,
      tenantLogoDataUrl: "data:image/png;base64,bG9nbw==",
      directorSignatureDataUrl: null,
    });

    assert.doesNotMatch(html, /alt="Firma del director o quien entrega"/);
    assert.match(html, /signature-cell__image-wrap/);
  });

  it("builds a sanitized filename", () => {
    assert.equal(
      buildFormatoEntregaPdfFilename("10 20/30", "2026-04"),
      "formato-entrega-10-20-30-2026-04.pdf",
    );
  });
});
