import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../../../test/render-with-providers";
import { server } from "../../../test/test-server";
import { AdultoMayorProgramPanel } from "./adulto-mayor-program-panel";

const adultoMayorId = "0b17e370-8f81-48c0-b707-c7046f497855";
const periodsUrl = `http://localhost:3001/api/adultos-mayores/${adultoMayorId}/periodos-programa`;
const firstPeriodId = "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d";
const secondPeriodId = "8b9c0d1e-2f3a-4b4c-9d5e-6f7a8b9c0d1e";

function openPeriod(activationDate: string, id = firstPeriodId) {
  return {
    id,
    activationDate,
    inactivationDate: null,
    activationReason: null,
    inactivationReason: null,
    activatedByUserFullName: null,
    inactivatedByUserFullName: null,
  };
}

describe("AdultoMayorProgramPanel", () => {
  it("inactivates an active adult with the written date and reason", async () => {
    const requests: unknown[] = [];
    let state: object = { programStatus: "active", periods: [openPeriod("2026-07-15")] };
    server.use(
      http.get(periodsUrl, () => HttpResponse.json(state)),
      http.post(`${periodsUrl}/inactivar`, async ({ request }) => {
        requests.push(await request.json());
        state = {
          programStatus: "inactive",
          periods: [
            {
              ...openPeriod("2026-07-15"),
              inactivationDate: "2026-09-01",
              inactivationReason: "Se mudo con un familiar",
              inactivatedByUserFullName: "Admin Centro Demo",
            },
          ],
        };
        return HttpResponse.json(state);
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<AdultoMayorProgramPanel adultoMayorId={adultoMayorId} />);

    expect(await screen.findByText("Activo desde 15/07/2026")).toBeInTheDocument();
    const dateInput = screen.getByLabelText("Fecha de inactivación");
    await user.clear(dateInput);
    await user.type(dateInput, "2026-09-01");
    expect(screen.getByRole("button", { name: "Inactivar" })).toBeDisabled();
    await user.type(screen.getByLabelText("Motivo"), "Se mudo con un familiar");
    await user.click(screen.getByRole("button", { name: "Inactivar" }));

    expect(
      await screen.findByText("Activo del 15/07/2026 al 01/09/2026"),
    ).toBeInTheDocument();
    expect(requests).toEqual([{ inactivationDate: "2026-09-01", reason: "Se mudo con un familiar" }]);
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintegrar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha de reintegro")).toBeInTheDocument();
  });

  it("reintegrates an inactive adult and lists the newest period first", async () => {
    const requests: unknown[] = [];
    const closedPeriod = {
      ...openPeriod("2026-07-15"),
      inactivationDate: "2026-09-01",
    };
    let state: object = { programStatus: "inactive", periods: [closedPeriod] };
    server.use(
      http.get(periodsUrl, () => HttpResponse.json(state)),
      http.post(`${periodsUrl}/reintegrar`, async ({ request }) => {
        requests.push(await request.json());
        state = {
          programStatus: "active",
          periods: [closedPeriod, openPeriod("2026-10-01", secondPeriodId)],
        };
        return HttpResponse.json(state);
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<AdultoMayorProgramPanel adultoMayorId={adultoMayorId} />);

    const dateInput = await screen.findByLabelText("Fecha de reintegro");
    await user.clear(dateInput);
    await user.type(dateInput, "2026-10-01");
    await user.type(screen.getByLabelText("Motivo"), "Regreso al centro");
    await user.click(screen.getByRole("button", { name: "Reintegrar" }));

    const periods = await screen.findByRole("list", { name: "Periodos en el programa" });
    await within(periods).findByText("Activo desde 01/10/2026");
    expect(within(periods).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Activo desde 01/10/2026",
      "Activo del 15/07/2026 al 01/09/2026",
    ]);
    expect(requests).toEqual([{ activationDate: "2026-10-01", reason: "Regreso al centro" }]);
  });

  it("shows the API error when the date is rejected", async () => {
    server.use(
      http.get(periodsUrl, () =>
        HttpResponse.json({ programStatus: "active", periods: [openPeriod("2026-07-15")] }),
      ),
      http.post(`${periodsUrl}/inactivar`, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: "La fecha de inactivacion debe ser posterior a la fecha de activacion (15/07/2026).",
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<AdultoMayorProgramPanel adultoMayorId={adultoMayorId} />);

    const dateInput = await screen.findByLabelText("Fecha de inactivación");
    await user.clear(dateInput);
    await user.type(dateInput, "2026-07-15");
    await user.type(screen.getByLabelText("Motivo"), "Retiro voluntario");
    await user.click(screen.getByRole("button", { name: "Inactivar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La fecha de inactivacion debe ser posterior a la fecha de activacion (15/07/2026).",
    );
  });
});
