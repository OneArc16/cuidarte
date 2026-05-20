import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  adultoMayorFixture,
  alimentacionAdultoOptionFixture,
  alimentacionFixture,
  authUserFixture,
  directorUserFixture,
  medicoUserFixture,
} from "../../test/fixtures";
import { server } from "../../test/test-server";
import { renderAppAtPath, resetAppTestState } from "../../test/helpers/app-test.helpers";
import { mockAuthMe } from "../../test/helpers/msw-auth.helpers";
import { mockAlimentacionLookup } from "../../test/helpers/msw-domain.helpers";

type AlimentacionRegistroPayload = {
  adultoMayorId: string;
  refrigerio1: string;
  almuerzo: string;
  refrigerio2: string;
  auxilioTransporte: string;
};

type AlimentacionCreatePayload = {
  tenantId: string | null;
  deliveryDate: string;
  organizer: string;
  registros: AlimentacionRegistroPayload[];
};

const ALIMENTACION_LIST_ENDPOINT = "http://localhost:3001/api/registro-alimentacion";
const alimentacionSecondAdultoOptionFixture = {
  ...alimentacionAdultoOptionFixture,
  id: "84544a75-bf27-4dc8-950f-0c97cf108e47",
  documentNumber: "1004462425",
  fullName: "Daniel Andres Castano Navarro",
} as const;

function mockAlimentacionListForTests() {
  return http.get(ALIMENTACION_LIST_ENDPOINT, ({ request }) => {
    const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? "";
    const registros = [alimentacionFixture].filter((registro) =>
      [registro.documentNumber, registro.fullName, registro.organizer]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );

    return HttpResponse.json({ registros });
  });
}

describe("App alimentacion flow", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("hides the feeding shortcut in Adultos mayores for unsupported roles", async () => {
    server.use(mockAuthMe(medicoUserFixture));
    renderAppAtPath("/adultos-mayores");

    expect(
      await screen.findByRole("heading", { name: "Listado de adultos mayores" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: `Alimentacion de ${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
      }),
    ).not.toBeInTheDocument();
  });

  it("opens the feeding create page from the adultos mayores shortcut", async () => {
    server.use(
      mockAuthMe(authUserFixture),
      mockAlimentacionLookup({
        adultoMayor: alimentacionAdultoOptionFixture,
        existingRecordId: null,
      }),
    );
    const user = userEvent.setup();
    renderAppAtPath("/adultos-mayores");

    await user.click(
      await screen.findByRole("button", {
        name: `Alimentacion de ${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
      }),
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe(`/registro-alimentacion/new/${adultoMayorFixture.id}`);
    });
    expect(await screen.findByRole("button", { name: "Guardar alimentación" })).toBeInTheDocument();
    expect(screen.getByText(alimentacionAdultoOptionFixture.fullName)).toBeInTheDocument();
  });

  it("shows the feeding list when navigating to Registro de alimentación", async () => {
    server.use(mockAuthMe(authUserFixture), mockAlimentacionListForTests());
    renderAppAtPath("/registro-alimentacion");

    expect(await screen.findByRole("table")).toBeInTheDocument();
    const alimentacionRowAction = await screen.findByRole("button", {
      name: alimentacionFixture.fullName,
    });
    const alimentacionRow = alimentacionRowAction.closest("tr");

    expect(alimentacionRow).not.toBeNull();
    expect(
      within(alimentacionRow as HTMLTableRowElement).getByText(alimentacionFixture.deliveryDate),
    ).toBeInTheDocument();
    expect(
      within(alimentacionRow as HTMLTableRowElement).getAllByText("Entregado").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Agregar registro de alimentación" }),
    ).toBeInTheDocument();
  });

  it("allows director users to access Registro de alimentación", async () => {
    server.use(mockAuthMe(directorUserFixture), mockAlimentacionListForTests());
    renderAppAtPath("/registro-alimentacion");

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: alimentacionFixture.fullName }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Agregar registro de alimentación" }),
    ).toBeInTheDocument();
  });

  it("creates a feeding batch and returns to the list", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    let createPayload: AlimentacionCreatePayload | null = null;
    let registros = [alimentacionFixture];
    server.use(
      mockAuthMe(authUserFixture),
      http.get(ALIMENTACION_LIST_ENDPOINT, ({ request }) => {
        const deliveryDate = new URL(request.url).searchParams.get("deliveryDate");
        const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? null;
        const filteredRecords = registros.filter((registro) => {
          const matchesDate =
            deliveryDate === null || deliveryDate === "" || registro.deliveryDate === deliveryDate;
          const matchesSearch =
            search === null ||
            [registro.documentNumber, registro.fullName].join(" ").toLowerCase().includes(search);

          return matchesDate && matchesSearch;
        });

        return HttpResponse.json({ registros: filteredRecords });
      }),
      http.get("http://localhost:3001/api/registro-alimentacion/adultos-mayores-options", () =>
        HttpResponse.json({ adultosMayores: [alimentacionAdultoOptionFixture] }),
      ),
      http.post("http://localhost:3001/api/registro-alimentacion", async ({ request }) => {
        createPayload = (await request.json()) as AlimentacionCreatePayload;
        registros = [
          {
            ...alimentacionFixture,
            deliveryDate: "2026-04-24",
          },
        ];

        return HttpResponse.json({ createdCount: 1 });
      }),
    );
    const user = userEvent.setup();
    renderAppAtPath("/registro-alimentacion/new");

    const deliveryDateInput = await screen.findByLabelText("Fecha");

    await user.clear(deliveryDateInput);
    await user.type(deliveryDateInput, "2026-04-24");
    await user.selectOptions(screen.getByLabelText("Organizador"), "nutricionista");
    await user.type(screen.getByLabelText("Buscar por nombre o documento"), "1020304050");
    await user.click(screen.getByRole("button", { name: /Rosa Elena Martinez Rojas/i }));
    await user.selectOptions(
      screen.getByLabelText(/Refrigerio 1 de Rosa Elena Martinez Rojas/i),
      "entregado",
    );
    await user.selectOptions(
      screen.getByLabelText(/^Almuerzo de Rosa Elena Martinez Rojas$/i),
      "entregado",
    );
    await user.selectOptions(
      screen.getByLabelText(/Refrigerio 2 de Rosa Elena Martinez Rojas/i),
      "no_aplica",
    );
    await user.selectOptions(
      screen.getByLabelText(/Auxilio de transporte de Rosa Elena Martinez Rojas/i),
      "entregado",
    );
    await user.click(screen.getByRole("button", { name: "Guardar alimentación" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/registro-alimentacion");
    });
    expect(
      await screen.findByRole("button", { name: alimentacionFixture.fullName }),
    ).toBeInTheDocument();
    expect(createPayload).toMatchObject({
      tenantId: alimentacionAdultoOptionFixture.tenantId,
      deliveryDate: "2026-04-24",
      organizer: "nutricionista",
      registros: [
        {
          adultoMayorId: adultoMayorFixture.id,
          refrigerio1: "entregado",
          almuerzo: "entregado",
          refrigerio2: "no_aplica",
          auxilioTransporte: "entregado",
        },
      ],
    });
  });

  it("marks and clears all item statuses with row actions", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    server.use(
      mockAuthMe(authUserFixture),
      http.get("http://localhost:3001/api/registro-alimentacion/adultos-mayores-options", () =>
        HttpResponse.json({ adultosMayores: [alimentacionAdultoOptionFixture] }),
      ),
    );
    const user = userEvent.setup();
    renderAppAtPath("/registro-alimentacion/new");

    const deliveryDateInput = await screen.findByLabelText("Fecha");

    await user.clear(deliveryDateInput);
    await user.type(deliveryDateInput, "2026-04-24");
    await user.type(screen.getByLabelText("Buscar por nombre o documento"), "1020304050");
    await user.click(screen.getByRole("button", { name: /Rosa Elena Martinez Rojas/i }));
    await user.click(
      screen.getByRole("button", { name: /Marcar entregado Rosa Elena Martinez Rojas/i }),
    );

    expect(
      screen.getByLabelText(/Refrigerio 1 de Rosa Elena Martinez Rojas/i),
    ).toHaveValue("entregado");
    expect(screen.getByLabelText(/^Almuerzo de Rosa Elena Martinez Rojas$/i)).toHaveValue(
      "entregado",
    );
    expect(
      screen.getByLabelText(/Refrigerio 2 de Rosa Elena Martinez Rojas/i),
    ).toHaveValue("entregado");
    expect(
      screen.getByLabelText(/Auxilio de transporte de Rosa Elena Martinez Rojas/i),
    ).toHaveValue("entregado");

    await user.click(screen.getByRole("button", { name: /Desmarcar Rosa Elena Martinez Rojas/i }));

    expect(screen.getByLabelText(/Refrigerio 1 de Rosa Elena Martinez Rojas/i)).toHaveValue("");
    expect(screen.getByLabelText(/^Almuerzo de Rosa Elena Martinez Rojas$/i)).toHaveValue("");
    expect(screen.getByLabelText(/Refrigerio 2 de Rosa Elena Martinez Rojas/i)).toHaveValue("");
    expect(screen.getByLabelText(/Auxilio de transporte de Rosa Elena Martinez Rojas/i)).toHaveValue(
      "",
    );
  });

  it("marks and clears all rows with global actions", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    server.use(
      mockAuthMe(authUserFixture),
      http.get("http://localhost:3001/api/registro-alimentacion/adultos-mayores-options", () =>
        HttpResponse.json({
          adultosMayores: [alimentacionAdultoOptionFixture, alimentacionSecondAdultoOptionFixture],
        }),
      ),
    );
    const user = userEvent.setup();
    renderAppAtPath("/registro-alimentacion/new");

    const deliveryDateInput = await screen.findByLabelText("Fecha");

    await user.clear(deliveryDateInput);
    await user.type(deliveryDateInput, "2026-04-24");
    await user.type(screen.getByLabelText("Buscar por nombre o documento"), "10");
    await user.click(screen.getByRole("button", { name: /Rosa Elena Martinez Rojas/i }));
    await user.click(screen.getByRole("button", { name: /Daniel Andres Castano Navarro/i }));
    await user.click(screen.getByRole("button", { name: /Marcar todos como entregados/i }));

    expect(
      screen.getByLabelText(/Refrigerio 1 de Rosa Elena Martinez Rojas/i),
    ).toHaveValue("entregado");
    expect(screen.getByLabelText(/^Almuerzo de Rosa Elena Martinez Rojas$/i)).toHaveValue(
      "entregado",
    );
    expect(
      screen.getByLabelText(/Refrigerio 2 de Rosa Elena Martinez Rojas/i),
    ).toHaveValue("entregado");
    expect(
      screen.getByLabelText(/Auxilio de transporte de Rosa Elena Martinez Rojas/i),
    ).toHaveValue("entregado");

    expect(
      screen.getByLabelText(/Refrigerio 1 de Daniel Andres Castano Navarro/i),
    ).toHaveValue("entregado");
    expect(screen.getByLabelText(/^Almuerzo de Daniel Andres Castano Navarro$/i)).toHaveValue(
      "entregado",
    );
    expect(
      screen.getByLabelText(/Refrigerio 2 de Daniel Andres Castano Navarro/i),
    ).toHaveValue("entregado");
    expect(
      screen.getByLabelText(/Auxilio de transporte de Daniel Andres Castano Navarro/i),
    ).toHaveValue("entregado");

    await user.click(screen.getByRole("button", { name: /Desmarcar todos/i }));

    expect(screen.getByLabelText(/Refrigerio 1 de Rosa Elena Martinez Rojas/i)).toHaveValue("");
    expect(screen.getByLabelText(/^Almuerzo de Rosa Elena Martinez Rojas$/i)).toHaveValue("");
    expect(screen.getByLabelText(/Refrigerio 2 de Rosa Elena Martinez Rojas/i)).toHaveValue("");
    expect(screen.getByLabelText(/Auxilio de transporte de Rosa Elena Martinez Rojas/i)).toHaveValue(
      "",
    );

    expect(screen.getByLabelText(/Refrigerio 1 de Daniel Andres Castano Navarro/i)).toHaveValue("");
    expect(screen.getByLabelText(/^Almuerzo de Daniel Andres Castano Navarro$/i)).toHaveValue("");
    expect(screen.getByLabelText(/Refrigerio 2 de Daniel Andres Castano Navarro/i)).toHaveValue("");
    expect(
      screen.getByLabelText(/Auxilio de transporte de Daniel Andres Castano Navarro/i),
    ).toHaveValue("");
  });
});
