import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

import {
  adultoMayorFixture,
  authUserFixture,
  directorUserFixture,
  superAdminUserFixture,
  departmentFixture,
  epsFixture,
  municipalityFixture,
} from "../../test/fixtures";
import { server } from "../../test/test-server";
import { renderAppAtPath, resetAppTestState } from "../../test/helpers/app-test.helpers";
import { mockAuthMe } from "../../test/helpers/msw-auth.helpers";

type AdultoMayorMutationPayload = {
  status?: string;
  documentType?: string;
  documentNumber?: string;
  firstName?: string;
  middleName?: string;
  firstSurname?: string;
  secondSurname?: string;
  country?: string;
  departmentId?: string;
  municipalityId?: string;
  epsId?: string | null;
};

describe("App adultos mayores flow", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("navigates to Adultos mayores and shows the tenant scoped table", async () => {
    server.use(mockAuthMe(authUserFixture));
    const user = userEvent.setup();
    renderAppAtPath("/home");

    expect(
      await screen.findByRole("heading", { name: authUserFixture.fullName }),
    ).toBeInTheDocument();

    const navigation = screen.getByRole("navigation", { name: "Modulos principales" });
    await user.click(within(navigation).getByRole("button", { name: "Adultos mayores" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/adultos-mayores");
    });
    expect(
      await screen.findByRole("heading", { name: "Listado de adultos mayores" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Centro" })).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(adultoMayorFixture.documentNumber))).toBeInTheDocument();
    expect(screen.getByText(adultoMayorFixture.names)).toBeInTheDocument();
    expect(screen.getByText(adultoMayorFixture.surnames)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `Alimentacion de ${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
      }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", {
        name: `Atencion individual de ${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: `Editar ${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
      }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", {
        name: `Historia clinica de ${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
      }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Crear adulto mayor" })).toHaveClass(
      "adultos-floating-action",
    );
  });

  it("creates an adulto mayor from the tabbed form", async () => {
    server.use(mockAuthMe(authUserFixture));
    let createPayload: AdultoMayorMutationPayload | null = null;
    server.use(
      http.post("http://localhost:3001/api/adultos-mayores", async ({ request }) => {
        createPayload = (await request.json()) as AdultoMayorMutationPayload;

        return HttpResponse.json({
          ...adultoMayorFixture,
          id: "25ce51a5-f0a6-4374-a6b4-815348cbd26d",
          documentNumber: "1099887766",
          names: "Julia Mercedes",
          surnames: "Lopez Cano",
          firstName: "Julia",
          middleName: "Mercedes",
          firstSurname: "Lopez",
          secondSurname: "Cano",
        });
      }),
    );
    const user = userEvent.setup();
    renderAppAtPath("/adultos-mayores/new");

    expect(await screen.findByRole("heading", { name: "Nuevo adulto mayor" })).toHaveClass(
      "visually-hidden",
    );
    await user.type(screen.getByLabelText("Numero de documento"), "1099887766");
    await user.type(screen.getByLabelText("Primer nombre"), "Julia");
    await user.type(screen.getByLabelText("Segundo nombre"), "Mercedes");
    await user.type(screen.getByLabelText("Primer apellido"), "Lopez");
    await user.type(screen.getByLabelText("Segundo apellido"), "Cano");
    await user.type(screen.getByLabelText("Fecha nacimiento"), "1949-02-18");
    await user.click(screen.getByRole("tab", { name: "Residencia" }));
    await user.type(screen.getByLabelText("Direccion"), "Calle 70 # 10-20");
    await user.type(screen.getByLabelText("Departamento"), departmentFixture.name.slice(0, 3));
    await user.click(await screen.findByRole("option", { name: departmentFixture.name }));
    await waitFor(() => {
      expect(screen.getByLabelText("Municipio")).toBeEnabled();
    });
    await user.type(screen.getByLabelText("Municipio"), municipalityFixture.name.slice(0, 3));
    await user.click(await screen.findByRole("option", { name: municipalityFixture.name }));
    await user.click(screen.getByRole("tab", { name: "Salud" }));
    await user.type(screen.getByLabelText("EPS"), epsFixture.name.slice(0, 3));
    await user.click(await screen.findByRole("option", { name: epsFixture.name }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        "/adultos-mayores/25ce51a5-f0a6-4374-a6b4-815348cbd26d/edit",
      );
    });
    expect(createPayload).toMatchObject({
      status: "alive",
      documentType: "cc",
      documentNumber: "1099887766",
      firstName: "Julia",
      middleName: "Mercedes",
      firstSurname: "Lopez",
      secondSurname: "Cano",
      country: "Colombia",
      departmentId: departmentFixture.id,
      municipalityId: municipalityFixture.id,
      epsId: epsFixture.id,
    });
  });

  it("edits an adulto mayor from the reusable form", async () => {
    server.use(mockAuthMe(authUserFixture));
    const successToastSpy = vi.spyOn(toast, "success");
    let updatePayload: AdultoMayorMutationPayload | null = null;
    server.use(
      http.patch(
        "http://localhost:3001/api/adultos-mayores/:adultoMayorId",
        async ({ request }) => {
          updatePayload = (await request.json()) as AdultoMayorMutationPayload;

          return HttpResponse.json({
            ...adultoMayorFixture,
            names: "Rosa Maria",
            middleName: "Maria",
            status: "deceased",
          });
        },
      ),
    );
    const user = userEvent.setup();
    renderAppAtPath(`/adultos-mayores/${adultoMayorFixture.id}/edit`);

    const secondNameInput = await screen.findByLabelText("Segundo nombre");

    await user.selectOptions(screen.getByLabelText("Estado"), "deceased");
    await user.type(screen.getByLabelText("Fecha de defuncion"), "2026-09-12");
    await user.clear(secondNameInput);
    await user.type(secondNameInput, "Maria");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(updatePayload).toMatchObject({
        status: "deceased",
        documentNumber: adultoMayorFixture.documentNumber,
        firstName: "Rosa",
        middleName: "Maria",
        firstSurname: "Martinez",
      });
      expect(successToastSpy).toHaveBeenCalledWith("Cambios guardados.");
    });
  });

  it("allows clearing an existing department to start a new search", async () => {
    server.use(mockAuthMe(authUserFixture));
    const user = userEvent.setup();
    renderAppAtPath(`/adultos-mayores/${adultoMayorFixture.id}/edit`);

    await screen.findByLabelText("Primer nombre");
    await user.click(screen.getByRole("tab", { name: "Residencia" }));

    const departmentInput = screen.getByLabelText("Departamento");
    await user.clear(departmentInput);

    expect(departmentInput).toHaveValue("");
    expect(screen.getByLabelText("Municipio")).toBeDisabled();
  });

  it("allows clearing an existing EPS to start a new search", async () => {
    server.use(mockAuthMe(authUserFixture));
    const user = userEvent.setup();
    renderAppAtPath(`/adultos-mayores/${adultoMayorFixture.id}/edit`);

    await screen.findByLabelText("Primer nombre");
    await user.click(screen.getByRole("tab", { name: "Salud" }));

    const epsInput = screen.getByLabelText("EPS");
    await user.clear(epsInput);
    await user.type(epsInput, epsFixture.name.slice(0, 3));

    expect(await screen.findByRole("option", { name: epsFixture.name })).toBeInTheDocument();
  });

  it("shows the Centro column for SuperAdmin users in Adultos mayores", async () => {
    server.use(mockAuthMe(superAdminUserFixture));
    renderAppAtPath("/adultos-mayores");

    expect(
      await screen.findByRole("heading", { name: "Listado de adultos mayores" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Centro" })).toBeInTheDocument();
    expect(await screen.findByText(adultoMayorFixture.tenantName)).toBeInTheDocument();
  });

  it("exports and prints Adultos mayores using the current search", async () => {
    server.use(mockAuthMe(authUserFixture));
    let excelSearch: string | null = null;
    let pdfSearch: string | null = null;
    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:adultos-mayores");
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    server.use(
      http.get("http://localhost:3001/api/adultos-mayores/export/excel", ({ request }) => {
        excelSearch = new URL(request.url).searchParams.get("search");

        return new HttpResponse("excel", {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        });
      }),
      http.get("http://localhost:3001/api/adultos-mayores/export/pdf", ({ request }) => {
        pdfSearch = new URL(request.url).searchParams.get("search");

        return new HttpResponse("pdf", {
          headers: {
            "Content-Type": "application/pdf",
          },
        });
      }),
    );
    const print = vi.fn();
    vi.stubGlobal("print", print);
    const user = userEvent.setup();
    renderAppAtPath("/adultos-mayores");

    expect(
      await screen.findByRole("heading", { name: "Listado de adultos mayores" }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Buscar adulto mayor"), "Rosa");
    await user.click(screen.getByRole("button", { name: "Exportar a Excel" }));

    await waitFor(() => {
      expect(excelSearch).toBe("Rosa");
    });

    await user.click(screen.getByRole("button", { name: "Exportar a PDF" }));

    await waitFor(() => {
      expect(pdfSearch).toBe("Rosa");
    });
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(2);
    expect(openSpy).toHaveBeenCalledWith("blob:adultos-mayores", "_blank", "noopener,noreferrer");

    await user.click(screen.getByRole("button", { name: "Imprimir listado" }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("allows director users to open the import flow for their tenant", async () => {
    server.use(mockAuthMe(directorUserFixture));
    let requestedTenantId: string | null = "pending";
    server.use(
      http.post("http://localhost:3001/api/adultos-mayores/imports/validate", ({ request }) => {
        requestedTenantId = new URL(request.url).searchParams.get("tenantId");

        return HttpResponse.json({
          importId: "c54699f4-7dfd-40c4-ae98-8b14d11be26a",
          status: "ready",
          tenant: {
            id: directorUserFixture.tenantId,
            name: "Centro Demo",
          },
          requestedByUserId: directorUserFixture.id,
          originalFilename: "plantilla-importacion-adultos-mayores-v1.xlsx",
          fileChecksumSha256: "a".repeat(64),
          templateVersion: 1,
          summary: {
            totalRows: 1,
            readyRows: 1,
            updateRows: 0,
            invalidRows: 0,
            warningRows: 0,
            unchangedRows: 0,
            existingRows: 0,
            createdRows: 0,
            updatedRows: 0,
          },
          issues: [],
          rows: [],
          canConfirm: true,
          expiresAt: "2026-08-16T18:00:00.000Z",
          confirmedAt: null,
          failureCode: null,
          createdAt: "2026-08-16T17:00:00.000Z",
          updatedAt: "2026-08-16T17:00:00.000Z",
        });
      }),
    );
    const user = userEvent.setup();
    const { container } = renderAppAtPath("/adultos-mayores");

    expect(
      await screen.findByRole("heading", { name: "Listado de adultos mayores" }),
    ).toBeInTheDocument();
    const toolbar = screen.getByRole("region", { name: "Herramientas del listado" });

    expect(
      within(toolbar).getByRole("button", { name: "Importar adultos mayores" }),
    ).toBeInTheDocument();

    await user.click(within(toolbar).getByRole("button", { name: "Importar adultos mayores" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/adultos-mayores/importar");
    });
    expect(
      await screen.findByRole("heading", { name: "Importar adultos mayores" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Centro")).not.toBeInTheDocument();

    const fileInput = container.querySelector('input[type="file"]');

    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error("Expected import file input to be present");
    }

    const file = new File(["plantilla"], "plantilla-importacion-adultos-mayores-v1.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    await user.upload(fileInput, file);
    expect(screen.getByRole("button", { name: "Validar archivo" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Validar archivo" }));

    await waitFor(() => {
      expect(requestedTenantId).toBeNull();
    });
  });

  it("allows SuperAdmin users to send an adulto mayor to trash and access the trash", async () => {
    server.use(mockAuthMe(superAdminUserFixture));
    let deletionReason: string | null = null;
    server.use(
      http.delete(
        "http://localhost:3001/api/adultos-mayores/:adultoMayorId",
        async ({ request }) => {
          deletionReason = ((await request.json()) as { reason: string }).reason;
          return HttpResponse.json({ success: true });
        },
      ),
    );
    const user = userEvent.setup();
    renderAppAtPath("/adultos-mayores");

    await user.click(
      await screen.findByRole("button", {
        name: `Enviar a papelera ${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
      }),
    );
    await user.type(screen.getByLabelText("Motivo"), "Registro duplicado");
    await user.click(screen.getByRole("button", { name: "Enviar a papelera" }));

    await waitFor(() => expect(deletionReason).toBe("Registro duplicado"));
    await user.click(screen.getByRole("button", { name: "Papelera" }));
    await waitFor(() => expect(window.location.pathname).toBe("/adultos-mayores/papelera"));
    expect(
      await screen.findByRole("region", { name: "Papelera de adultos mayores" }),
    ).toBeInTheDocument();
  });
});
