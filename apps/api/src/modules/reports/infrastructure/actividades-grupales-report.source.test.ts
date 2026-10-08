import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import { ActividadesGrupalesReportSource } from "./actividades-grupales-report.source";

const actor: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  email: "director@centro-demo.test",
  fullName: "Director Centro Demo",
  role: "director",
  passwordSetByAdmin: true,
};

describe("ActividadesGrupalesReportSource", () => {
  it("uses the standardized acta filename inside the ZIP", async () => {
    const source = new ActividadesGrupalesReportSource(
      {
        async findActaReportCandidates() {
          return [{ id: "actividad-1" }];
        },
      } as never,
      {
        async exportPdf() {
          return {
            buffer: Buffer.from("pdf"),
            contentType: "application/pdf",
            filename: "SALU_001_SENSIBILIZACION_ACTA_SALUD_PREVENTIVA_2026_07_15.pdf",
          };
        },
      } as never,
    );

    const documents = [];
    for await (const document of source.documents(
      { tenantId: actor.tenantId!, tenantName: "Centro de Vida Demo" },
      "2026-07",
      actor,
    )) {
      documents.push(document);
    }

    assert.equal(
      documents[0]?.filename,
      "SALU_001_SENSIBILIZACION_ACTA_SALUD_PREVENTIVA_2026_07_15.pdf",
    );
  });
});
