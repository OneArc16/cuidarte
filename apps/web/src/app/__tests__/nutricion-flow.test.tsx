import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { authUserFixture } from "../../test/fixtures";
import { mockAuthMe } from "../../test/helpers/msw-auth.helpers";
import { renderAppAtPath, resetAppTestState } from "../../test/helpers/app-test.helpers";
import { server } from "../../test/test-server";

const nutritionistUser = {
  ...authUserFixture,
  id: "c4b4f9a9-4742-4165-b0f6-f07d3c80df0e",
  email: "nutricion@centro-demo.test",
  fullName: "Nutricionista Centro Demo",
  role: "nutricionista",
} as const;

const adultoMayor = {
  id: "0b17e370-8f81-48c0-b707-c7046f497855",
  tenantId: authUserFixture.tenantId,
  tenantName: "Centro Demo",
  documentNumber: "1020304050",
  fullName: "Rosa Elena Martinez Rojas",
  phone: "3105550101",
  age: 78,
  sex: "female",
  eps: "Salud Demo",
  healthRegime: "subsidized",
};

describe("App nutrición flow", () => {
  beforeEach(() => {
    resetAppTestState();
    server.use(
      mockAuthMe(nutritionistUser),
      http.get("http://localhost:3001/api/nutricion/adultos-mayores", ({ request }) => {
        const search = new URL(request.url).searchParams.get("search");
        return HttpResponse.json({
          adultosMayores: search === "sin-resultados" ? [] : [adultoMayor],
          total: search === "sin-resultados" ? 0 : 1,
        });
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the module in the sidebar and lists adults available for nutrition", async () => {
    const user = userEvent.setup();
    renderAppAtPath("/nutricion");

    expect(
      await screen.findByRole("heading", { name: "Planes y seguimiento nutricional" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Modulos principales")).getByRole("button", {
        name: "Nutrición",
      }),
    ).toHaveAttribute("href", "/nutricion");
    expect(screen.getByLabelText("Filtros de nutrición")).toBeInTheDocument();
    expect(await screen.findByText("Rosa Elena Martinez Rojas")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Historial nutricional de Rosa Elena Martinez Rojas",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Nueva atención nutricional de Rosa Elena Martinez Rojas",
      }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar adulto mayor" }),
      "sin-resultados",
    );

    expect(
      await screen.findByText("No hay adultos mayores para el filtro actual."),
    ).toBeInTheDocument();
  });
});
