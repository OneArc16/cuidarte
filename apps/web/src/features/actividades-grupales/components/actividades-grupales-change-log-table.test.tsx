import { type ActividadGrupalChangeLogEntry } from "@cuidarte/contracts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ActividadesGrupalesChangeLogTable } from "./actividades-grupales-change-log-table";

const entry: ActividadGrupalChangeLogEntry = {
  id: "8f1c6f1e-6a52-4f0e-9a51-1c2b3d4e5f60",
  activityId: "8f1c6f1e-6a52-4f0e-9a51-1c2b3d4e5f61",
  tenantId: "8f1c6f1e-6a52-4f0e-9a51-1c2b3d4e5f62",
  tenantName: "Centro de vida",
  actaNumber: "CAMP-001",
  activityName: "Enfermeria",
  action: "updated",
  actorUserId: "8f1c6f1e-6a52-4f0e-9a51-1c2b3d4e5f63",
  actorUserFullName: "SuperAdmin Cuidarte",
  actorIp: null,
  actorUserAgent: null,
  occurredAt: "2026-11-09T21:18:00.000Z",
  changes: [
    {
      field: "Profesionales asignados",
      before: "1 asignado(s)",
      after: "3 asignado(s) · Agregó: Juan Navarro, Daniel Ruiz",
    },
  ],
};

describe("ActividadesGrupalesChangeLogTable", () => {
  it("muestra el resumen en la fila y los nombres en el detalle completo", async () => {
    render(
      <ActividadesGrupalesChangeLogTable entries={[entry]} isLoading={false} showTenantColumn />,
    );

    expect(screen.getByText("Después: 3 asignado(s)")).toBeInTheDocument();
    expect(screen.queryByText(/Juan Navarro/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ver detalle completo" }));

    const detail = screen.getByRole("region", { name: "Cambio en Profesionales asignados" });
    expect(within(detail).getByText("Agregó: Juan Navarro, Daniel Ruiz")).toBeInTheDocument();
  });
});
