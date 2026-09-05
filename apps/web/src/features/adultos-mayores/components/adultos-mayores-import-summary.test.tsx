import { type AdultoMayorImportDetail } from "@cuidarte/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdultosMayoresImportConfirmation } from "./adultos-mayores-import-confirmation";
import { AdultosMayoresImportSummary } from "./adultos-mayores-import-summary";

describe("resumen de importacion de adultos mayores", () => {
  it("separa las filas por crear, actualizar y sin cambios antes de confirmar", () => {
    const detail = createDetail();

    render(
      <>
        <AdultosMayoresImportSummary detail={detail} />
        <AdultosMayoresImportConfirmation detail={detail} isPending={false} onConfirm={vi.fn()} />
      </>,
    );

    expect(screen.getByText("Listas para crear").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("Listas para actualizar").nextElementSibling).toHaveTextContent("3");
    expect(screen.getAllByText("Sin cambios")[0]?.nextElementSibling).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "Confirmar importacion" })).toBeEnabled();
  });

  it("muestra los resultados efectivos al completar la transaccion", () => {
    const detail = createDetail({
      status: "completed",
      canConfirm: false,
      summary: {
        ...createDetail().summary,
        createdRows: 2,
        updatedRows: 3,
      },
    });

    render(<AdultosMayoresImportSummary detail={detail} />);

    expect(screen.getByText("Creadas").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("Actualizadas").nextElementSibling).toHaveTextContent("3");
    expect(screen.getByText("La importacion se completo correctamente.")).toBeInTheDocument();
  });
});

function createDetail(overrides: Partial<AdultoMayorImportDetail> = {}): AdultoMayorImportDetail {
  return {
    importId: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
    status: "ready",
    tenant: {
      id: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
      name: "Centro Demo",
    },
    requestedByUserId: "1488c239-6cb1-4125-988a-734cd39d13d3",
    originalFilename: "adultos-mayores.xlsx",
    fileChecksumSha256: "a".repeat(64),
    templateVersion: 1,
    summary: {
      totalRows: 6,
      readyRows: 2,
      invalidRows: 0,
      warningRows: 0,
      existingRows: 4,
      updateRows: 3,
      updatedRows: 0,
      unchangedRows: 1,
      createdRows: 0,
    },
    issues: [],
    rows: [],
    canConfirm: true,
    expiresAt: "2026-08-12T12:00:00.000Z",
    confirmedAt: null,
    failureCode: null,
    createdAt: "2026-08-11T12:00:00.000Z",
    updatedAt: "2026-08-11T12:00:00.000Z",
    ...overrides,
  };
}
