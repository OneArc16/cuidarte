import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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
    vi.useRealTimers();
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
      within(alimentacionRow as HTMLTableRowElement).getByText(
        alimentacionFixture.deliveryDate.slice(0, 7),
      ),
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

  it("exports individual feeding format from the grouped row", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    let receivedAdultoMayorId: string | null = null;
    let receivedDeliveryMonth: string | null = null;
    server.use(
      mockAuthMe(authUserFixture),
      mockAlimentacionListForTests(),
      http.get(
        "http://localhost:3001/api/registro-alimentacion/adultos-mayores/:adultoMayorId/formato-entrega/pdf",
        ({ params, request }) => {
          receivedAdultoMayorId = params.adultoMayorId as string;
          receivedDeliveryMonth = new URL(request.url).searchParams.get("deliveryMonth");

          return new HttpResponse(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
            headers: {
              "Content-Type": "application/pdf",
            },
          });
        },
      ),
    );
    const user = userEvent.setup();
    renderAppAtPath("/registro-alimentacion");

    await user.click(
      await screen.findByRole("button", {
        name: `Exportar formato de ${alimentacionFixture.fullName}`,
      }),
    );

    await waitFor(() => {
      expect(receivedAdultoMayorId).toBe(alimentacionFixture.adultoMayorId);
    });
    expect(receivedDeliveryMonth).toBe("2026-04");
  });

  it("imports a PDF after showing the beneficiary, month and file details", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    let uploadedDeliveryMonth: string | null = null;
    let uploadedContentType: string | null = null;
    server.use(
      mockAuthMe(authUserFixture),
      mockAlimentacionListForTests(),
      http.post(
        "http://localhost:3001/api/registro-alimentacion/adultos-mayores/:adultoMayorId/formato-entrega/imported-pdfs",
        ({ request }) => {
          uploadedDeliveryMonth = new URL(request.url).searchParams.get("deliveryMonth");
          uploadedContentType = request.headers.get("content-type");

          return HttpResponse.json({
            version: {
              id: "1a3782f0-b999-412c-a0f4-31ed47cb8f3f",
              version: 1,
              originalName: "formato-diligenciado.pdf",
              mimeType: "application/pdf",
              sizeBytes: 16,
              importedByUserId: authUserFixture.id,
              importedByUserFullName: authUserFixture.fullName,
              importedAt: "2026-04-24T12:00:00.000Z",
            },
          });
        },
      ),
    );
    const user = userEvent.setup();
    renderAppAtPath("/registro-alimentacion");

    await user.click(
      await screen.findByRole("button", {
        name: `Importar formato diligenciado de ${alimentacionFixture.fullName}`,
      }),
    );

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');

    expect(fileInput).not.toBeNull();
    await user.upload(
      fileInput!,
      new File(["%PDF-1.7\ncontenido"], "formato-diligenciado.pdf", {
        type: "application/pdf",
      }),
    );

    const importDialog = await screen.findByRole("dialog", { name: "Confirmar importacion" });

    expect(importDialog).toBeInTheDocument();
    expect(within(importDialog).getByText(alimentacionFixture.fullName)).toBeInTheDocument();
    expect(within(importDialog).getByText("2026-04")).toBeInTheDocument();
    expect(within(importDialog).getByText("formato-diligenciado.pdf")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmar importacion" }));

    await waitFor(() => {
      expect(uploadedContentType).toContain("multipart/form-data");
    });
    expect(uploadedDeliveryMonth).toBe("2026-04");
    expect(
      await screen.findByText(
        `PDF importado correctamente como versión 1 para ${alimentacionFixture.fullName}.`,
      ),
    ).toBeInTheDocument();
  });

  it("rejects a non-PDF before opening the import confirmation", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    server.use(mockAuthMe(authUserFixture), mockAlimentacionListForTests());
    const user = userEvent.setup();
    renderAppAtPath("/registro-alimentacion");

    await user.click(
      await screen.findByRole("button", {
        name: `Importar formato diligenciado de ${alimentacionFixture.fullName}`,
      }),
    );

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');

    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, {
      target: {
        files: [new File(["not a pdf"], "formato.txt", { type: "text/plain" })],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Selecciona un archivo PDF válido.");
    expect(screen.queryByRole("dialog", { name: "Confirmar importacion" })).not.toBeInTheDocument();
  });

  it("creates a feeding batch and returns to the list", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    let createPayload: AlimentacionCreatePayload | null = null;
    let registros = [alimentacionFixture];
    server.use(
      mockAuthMe(authUserFixture),
      http.get(ALIMENTACION_LIST_ENDPOINT, ({ request }) => {
        const deliveryMonth = new URL(request.url).searchParams.get("deliveryMonth");
        const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? null;
        const filteredRecords = registros.filter((registro) => {
          const matchesMonth =
            deliveryMonth === null ||
            deliveryMonth === "" ||
            registro.deliveryDate.startsWith(`${deliveryMonth}-`);
          const matchesSearch =
            search === null ||
            [registro.documentNumber, registro.fullName].join(" ").toLowerCase().includes(search);

          return matchesMonth && matchesSearch;
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

    expect(screen.getByLabelText(/Refrigerio 1 de Rosa Elena Martinez Rojas/i)).toHaveValue(
      "entregado",
    );
    expect(screen.getByLabelText(/^Almuerzo de Rosa Elena Martinez Rojas$/i)).toHaveValue(
      "entregado",
    );
    expect(screen.getByLabelText(/Refrigerio 2 de Rosa Elena Martinez Rojas/i)).toHaveValue(
      "entregado",
    );
    expect(
      screen.getByLabelText(/Auxilio de transporte de Rosa Elena Martinez Rojas/i),
    ).toHaveValue("entregado");

    await user.click(screen.getByRole("button", { name: /Desmarcar Rosa Elena Martinez Rojas/i }));

    expect(screen.getByLabelText(/Refrigerio 1 de Rosa Elena Martinez Rojas/i)).toHaveValue("");
    expect(screen.getByLabelText(/^Almuerzo de Rosa Elena Martinez Rojas$/i)).toHaveValue("");
    expect(screen.getByLabelText(/Refrigerio 2 de Rosa Elena Martinez Rojas/i)).toHaveValue("");
    expect(
      screen.getByLabelText(/Auxilio de transporte de Rosa Elena Martinez Rojas/i),
    ).toHaveValue("");
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
    await user.type(screen.getByLabelText("Buscar por nombre o documento"), "10");
    await user.click(screen.getByRole("button", { name: /Daniel Andres Castano Navarro/i }));
    await user.click(screen.getByRole("button", { name: /Marcar todos como entregados/i }));

    expect(screen.getByLabelText(/Refrigerio 1 de Rosa Elena Martinez Rojas/i)).toHaveValue(
      "entregado",
    );
    expect(screen.getByLabelText(/^Almuerzo de Rosa Elena Martinez Rojas$/i)).toHaveValue(
      "entregado",
    );
    expect(screen.getByLabelText(/Refrigerio 2 de Rosa Elena Martinez Rojas/i)).toHaveValue(
      "entregado",
    );
    expect(
      screen.getByLabelText(/Auxilio de transporte de Rosa Elena Martinez Rojas/i),
    ).toHaveValue("entregado");

    expect(screen.getByLabelText(/Refrigerio 1 de Daniel Andres Castano Navarro/i)).toHaveValue(
      "entregado",
    );
    expect(screen.getByLabelText(/^Almuerzo de Daniel Andres Castano Navarro$/i)).toHaveValue(
      "entregado",
    );
    expect(screen.getByLabelText(/Refrigerio 2 de Daniel Andres Castano Navarro/i)).toHaveValue(
      "entregado",
    );
    expect(
      screen.getByLabelText(/Auxilio de transporte de Daniel Andres Castano Navarro/i),
    ).toHaveValue("entregado");

    await user.click(screen.getByRole("button", { name: /Desmarcar todos/i }));

    expect(screen.getByLabelText(/Refrigerio 1 de Rosa Elena Martinez Rojas/i)).toHaveValue("");
    expect(screen.getByLabelText(/^Almuerzo de Rosa Elena Martinez Rojas$/i)).toHaveValue("");
    expect(screen.getByLabelText(/Refrigerio 2 de Rosa Elena Martinez Rojas/i)).toHaveValue("");
    expect(
      screen.getByLabelText(/Auxilio de transporte de Rosa Elena Martinez Rojas/i),
    ).toHaveValue("");

    expect(screen.getByLabelText(/Refrigerio 1 de Daniel Andres Castano Navarro/i)).toHaveValue("");
    expect(screen.getByLabelText(/^Almuerzo de Daniel Andres Castano Navarro$/i)).toHaveValue("");
    expect(screen.getByLabelText(/Refrigerio 2 de Daniel Andres Castano Navarro/i)).toHaveValue("");
    expect(
      screen.getByLabelText(/Auxilio de transporte de Daniel Andres Castano Navarro/i),
    ).toHaveValue("");
  });
});
