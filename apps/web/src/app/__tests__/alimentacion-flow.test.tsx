import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

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

function mockAlimentacionDeleteFlow() {
  let registros = [{ ...alimentacionFixture, canDelete: true }];
  let deletedRecordId: string | null = null;

  return {
    listHandler: http.get(ALIMENTACION_LIST_ENDPOINT, ({ request }) => {
      const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? "";
      const filteredRecords = registros.filter((registro) =>
        [registro.documentNumber, registro.fullName, registro.organizer]
          .join(" ")
          .toLowerCase()
          .includes(search),
      );

      return HttpResponse.json({ registros: filteredRecords });
    }),
    deleteHandler: http.delete(
      "http://localhost:3001/api/registro-alimentacion/:recordId",
      ({ params }) => {
        deletedRecordId = params.recordId as string;
        registros = registros.filter((registro) => registro.id !== params.recordId);

        return HttpResponse.json({ success: true });
      },
    ),
    getDeletedRecordId: () => deletedRecordId,
  };
}

function mockAlimentacionImportFlow() {
  let registros = [{ ...alimentacionFixture }];

  return {
    listHandler: http.get(ALIMENTACION_LIST_ENDPOINT, ({ request }) => {
      const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? "";
      const filteredRecords = registros.filter((registro) =>
        [registro.documentNumber, registro.fullName, registro.organizer]
          .join(" ")
          .toLowerCase()
          .includes(search),
      );

      return HttpResponse.json({ registros: filteredRecords });
    }),
    importHandler: http.post(
      "http://localhost:3001/api/registro-alimentacion/adultos-mayores/:adultoMayorId/formato-entrega/imported-pdfs",
      async ({ request }) => {
        const uploadedDeliveryMonth = new URL(request.url).searchParams.get("deliveryMonth");
        const uploadedContentType = request.headers.get("content-type");

        if (uploadedDeliveryMonth !== "2026-04") {
          return HttpResponse.json({ message: "deliveryMonth inválido" }, { status: 400 });
        }

        if (uploadedContentType === null || !uploadedContentType.includes("multipart/form-data")) {
          return HttpResponse.json({ message: "content-type inválido" }, { status: 400 });
        }

        const version = {
          id: "1a3782f0-b999-412c-a0f4-31ed47cb8f3f",
          version: 1,
          originalName: "formato-diligenciado.pdf",
          mimeType: "application/pdf",
          sizeBytes: 16,
          importedByUserId: authUserFixture.id,
          importedByUserFullName: authUserFixture.fullName,
          importedAt: "2026-04-24T12:00:00.000Z",
        } as const;

        registros = registros.map((registro) =>
          registro.id === alimentacionFixture.id
            ? {
                ...registro,
                importedFormato: version,
              }
            : registro,
        );

        return HttpResponse.json({ version });
      },
    ),
  };
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

  it("warns when the adult already has feeding registered for the selected day", async () => {
    const warningToastSpy = vi.spyOn(toast, "warning");
    server.use(
      mockAuthMe(directorUserFixture),
      mockAlimentacionLookup({
        adultoMayor: alimentacionAdultoOptionFixture,
        existingRecordId: alimentacionFixture.id,
      }),
    );

    renderAppAtPath(`/registro-alimentacion/new/${adultoMayorFixture.id}`);

    await waitFor(() => {
      expect(warningToastSpy).toHaveBeenCalledWith(
        "Este adulto mayor ya tiene un registro de alimentación para el día seleccionado.",
      );
    });
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

  it("shows the delete confirmation dialog for a daily feeding record", async () => {
    server.use(mockAuthMe(authUserFixture));
    const { listHandler, deleteHandler } = mockAlimentacionDeleteFlow();
    server.use(listHandler, deleteHandler);
    const user = userEvent.setup();
    renderAppAtPath("/registro-alimentacion");

    const expandButton = await screen.findByRole("button", {
      name: `Mostrar registros de ${alimentacionFixture.fullName}`,
    });
    await user.click(expandButton);

    const deleteButton = await screen.findByRole("button", {
      name: `Eliminar alimentación de ${alimentacionFixture.fullName} del día ${alimentacionFixture.deliveryDate}`,
    });
    await user.click(deleteButton);

    const dialog = await screen.findByRole("dialog", { name: "Eliminar alimentación" });

    expect(dialog).toHaveTextContent(alimentacionFixture.fullName);
    expect(dialog).toHaveTextContent(alimentacionFixture.deliveryDate);
    expect(within(dialog).getByRole("button", { name: "Eliminar registro" })).toBeInTheDocument();
  });

  it("exports individual feeding format from the grouped row", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    const openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);
    server.use(mockAuthMe(authUserFixture), mockAlimentacionListForTests());
    const user = userEvent.setup();
    renderAppAtPath("/registro-alimentacion");

    await user.click(
      await screen.findByRole("button", {
        name: `Exportar formato de ${alimentacionFixture.fullName}`,
      }),
    );

    expect(openSpy).toHaveBeenCalledWith(
      `http://localhost:3001/api/registro-alimentacion/adultos-mayores/${adultoMayorFixture.id}/formato-entrega/pdf?deliveryMonth=2026-04`,
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("imports a PDF after showing the beneficiary, month and file details", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    server.use(mockAuthMe(authUserFixture));
    const { listHandler, importHandler } = mockAlimentacionImportFlow();
    server.use(listHandler, importHandler);
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
      expect(
        screen.getByRole("button", {
          name: /Descargar PDF importado v1 de Rosa Elena Martinez Rojas/i,
        }),
      ).toBeInTheDocument();
    });
  });

  it("downloads the imported PDF from the row action", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    const openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);
    server.use(
      mockAuthMe(authUserFixture),
      http.get(ALIMENTACION_LIST_ENDPOINT, () =>
        HttpResponse.json({
          registros: [
            {
              ...alimentacionFixture,
              importedFormato: {
                id: "6d0e0f91-d9f9-4cb7-bb08-08af2d5ac1f9",
                version: 1,
                originalName: "formato-importado.pdf",
                mimeType: "application/pdf",
                sizeBytes: 16,
                importedByUserId: authUserFixture.id,
                importedByUserFullName: authUserFixture.fullName,
                importedAt: "2026-04-24T12:00:00.000Z",
              },
            },
          ],
        }),
      ),
    );
    const user = userEvent.setup();
    renderAppAtPath("/registro-alimentacion");

    await user.click(
      await screen.findByRole("button", {
        name: /Descargar PDF importado v1 de Rosa Elena Martinez Rojas/i,
      }),
    );

    expect(openSpy).toHaveBeenCalledWith(
      `http://localhost:3001/api/registro-alimentacion/adultos-mayores/${adultoMayorFixture.id}/formato-entrega/imported-pdfs/6d0e0f91-d9f9-4cb7-bb08-08af2d5ac1f9/download`,
      "_blank",
      "noopener,noreferrer",
    );
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
      deliveryDates: ["2026-04-24"],
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
