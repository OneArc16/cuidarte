import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  backofficeTenantDetailFixture,
  departmentFixture,
  municipalityFixture,
  superAdminUserFixture,
} from "../../test/fixtures";
import { server } from "../../test/test-server";
import { loginAsSuperAdmin } from "../../test/helpers/auth-test.helpers";
import {
  renderApp,
  renderAppAtPath,
  resetAppTestState,
} from "../../test/helpers/app-test.helpers";
import { mockAuthMe } from "../../test/helpers/msw-auth.helpers";
import { mockAuthLoginSuccess } from "../../test/helpers/msw-domain.helpers";
import { expectBaseModules } from "../../test/helpers/navigation-test.helpers";

type BackofficeTenantPayload = {
  tenant: {
    name?: string;
    documentType?: string;
    documentNumber?: string;
    email?: string;
    departmentId?: string;
    municipalityId?: string;
  };
  owner: {
    fullName?: string;
    email?: string;
    password?: string;
  };
};

describe("App backoffice flow", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows BackOffice in the sidebar for super admin users", async () => {
    server.use(mockAuthLoginSuccess(superAdminUserFixture));
    const user = userEvent.setup();

    renderApp();

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    await loginAsSuperAdmin(user);

    expect(
      await screen.findByRole("heading", { name: "Super Admin CuidarTe" }),
    ).toBeInTheDocument();

    const navigation = screen.getByRole("navigation", { name: "Modulos principales" });

    expectBaseModules(navigation);
    expect(within(navigation).getByRole("button", { name: "BackOffice" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Usuario logueado" })).toHaveTextContent(
      "SuperAdmin",
    );
  });

  it("shows the BackOffice tenant table for SuperAdmin users", async () => {
    server.use(mockAuthMe(superAdminUserFixture));

    const { container } = renderAppAtPath("/backoffice");

    const backofficeTitle = await screen.findByRole("heading", { name: "Tenants" });

    expect(backofficeTitle).toHaveClass("visually-hidden");
    expect(container.querySelector(".backoffice-heading")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nuevo tenant" })).toHaveClass(
      "backoffice-floating-action",
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(await screen.findByText(backofficeTenantDetailFixture.tenant.name)).toBeInTheDocument();
    expect(screen.getByText(backofficeTenantDetailFixture.owner.fullName)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Abrir ${backofficeTenantDetailFixture.tenant.name}` }),
    ).toBeInTheDocument();
  });

  it("creates a tenant with its owner from BackOffice", async () => {
    server.use(mockAuthMe(superAdminUserFixture));
    let createPayload: BackofficeTenantPayload = {
      tenant: {},
      owner: {},
    };
    server.use(
      http.post("http://localhost:3001/api/backoffice/tenants", async ({ request }) => {
        createPayload = (await request.json()) as BackofficeTenantPayload;

        return HttpResponse.json({
          tenant: {
            ...backofficeTenantDetailFixture.tenant,
            id: "63c7aa4f-aee0-4a8e-90a3-4566cc4cc706",
            name: "Centro Nuevo",
          },
          owner: {
            ...backofficeTenantDetailFixture.owner,
            tenantId: "63c7aa4f-aee0-4a8e-90a3-4566cc4cc706",
            email: "propietario@centro-nuevo.test",
            fullName: "Propietario Centro Nuevo",
          },
          logo: null,
        });
      }),
      http.get(
        "http://localhost:3001/api/backoffice/tenants/63c7aa4f-aee0-4a8e-90a3-4566cc4cc706",
        () =>
          HttpResponse.json({
            tenant: {
              ...backofficeTenantDetailFixture.tenant,
              id: "63c7aa4f-aee0-4a8e-90a3-4566cc4cc706",
              name: "Centro Nuevo",
            },
            owner: {
              ...backofficeTenantDetailFixture.owner,
              tenantId: "63c7aa4f-aee0-4a8e-90a3-4566cc4cc706",
              email: "propietario@centro-nuevo.test",
              fullName: "Propietario Centro Nuevo",
            },
            logo: null,
          }),
      ),
    );
    const user = userEvent.setup();

    const { container } = renderAppAtPath("/backoffice/tenants/new");

    expect(await screen.findByRole("heading", { name: "Nuevo tenant" })).toHaveClass(
      "visually-hidden",
    );
    expect(container.querySelector(".backoffice-topbar")).not.toBeInTheDocument();
    expect(container.querySelector(".backoffice-form-nav .backoffice-back-action")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Volver" })).toHaveClass("backoffice-back-action");
    await user.type(screen.getByLabelText("Nombre del centro"), "Centro Nuevo");
    await user.type(screen.getByLabelText("Número de documento"), "901222333");
    await user.type(screen.getByLabelText("Correo del centro"), "contacto@centro-nuevo.test");
    await user.type(screen.getByLabelText("Teléfono"), "6015552233");
    await user.type(screen.getByLabelText("Dirección"), "Carrera 12 # 34-56");
    expect(screen.getByLabelText("Municipio")).toBeDisabled();
    await user.type(screen.getByLabelText("Departamento"), departmentFixture.name.slice(0, 3));
    await user.click(await screen.findByRole("option", { name: departmentFixture.name }));
    await waitFor(() => {
      expect(screen.getByLabelText("Municipio")).toBeEnabled();
    });
    await user.type(screen.getByLabelText("Municipio"), municipalityFixture.name.slice(0, 3));
    await user.click(await screen.findByRole("option", { name: municipalityFixture.name }));
    await user.type(screen.getByLabelText("Nombre completo"), "Propietario Centro Nuevo");
    await user.type(screen.getByLabelText("Correo de acceso"), "propietario@centro-nuevo.test");
    await user.type(screen.getByLabelText("Contraseña inicial"), "Cuidarte123!");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        "/backoffice/tenants/63c7aa4f-aee0-4a8e-90a3-4566cc4cc706",
      );
    });
    expect(createPayload).toMatchObject({
      tenant: {
        name: "Centro Nuevo",
        documentType: "nit",
        documentNumber: "901222333",
        email: "contacto@centro-nuevo.test",
        departmentId: backofficeTenantDetailFixture.tenant.departmentId,
        municipalityId: backofficeTenantDetailFixture.tenant.municipalityId,
      },
      owner: {
        fullName: "Propietario Centro Nuevo",
        email: "propietario@centro-nuevo.test",
      },
    });
  });

  it("edits a tenant and can leave the owner password unchanged", async () => {
    server.use(mockAuthMe(superAdminUserFixture));
    let updatePayload: BackofficeTenantPayload = {
      tenant: {},
      owner: {},
    };
    server.use(
      http.patch("http://localhost:3001/api/backoffice/tenants/:tenantId", async ({ request }) => {
        updatePayload = (await request.json()) as BackofficeTenantPayload;

        return HttpResponse.json({
          tenant: {
            ...backofficeTenantDetailFixture.tenant,
            name: "Centro Demo Editado",
          },
          owner: backofficeTenantDetailFixture.owner,
          logo: null,
        });
      }),
    );
    const user = userEvent.setup();

    renderAppAtPath(`/backoffice/tenants/${backofficeTenantDetailFixture.tenant.id}`);

    const nameInput = await screen.findByLabelText("Nombre del centro");

    await user.clear(nameInput);
    await user.type(nameInput, "Centro Demo Editado");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Cambios guardados.");
    const ownerPassword = updatePayload.owner.password;
    expect(ownerPassword).toBeUndefined();
    expect(updatePayload).toMatchObject({
      tenant: {
        name: "Centro Demo Editado",
      },
      owner: {
        email: backofficeTenantDetailFixture.owner.email,
      },
    });
  });

  it("uploads, previews and removes a tenant logo with explicit confirmation", async () => {
    server.use(
      mockAuthMe(superAdminUserFixture),
      http.put(
        "http://localhost:3001/api/backoffice/tenants/:tenantId/logo",
        () => {
          return HttpResponse.json({
            versionId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
            originalName: "logo-centro.png",
            mimeType: "image/png",
            sizeBytes: 1_204,
            checksum: "a".repeat(64),
            updatedAt: "2026-07-22T12:00:00.000Z",
          });
        },
      ),
      http.get(
        "http://localhost:3001/api/backoffice/tenants/:tenantId/logo/file",
        () =>
          new HttpResponse(new Blob(["normalized-logo"], { type: "image/png" }), {
            headers: { "Content-Type": "image/png" },
          }),
      ),
      http.delete(
        "http://localhost:3001/api/backoffice/tenants/:tenantId/logo",
        () => HttpResponse.json({ success: true }),
      ),
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:tenant-logo");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();

    renderAppAtPath(`/backoffice/tenants/${backofficeTenantDetailFixture.tenant.id}`);

    expect(await screen.findByText("Logo pendiente")).toBeInTheDocument();
    const fileInput = screen.getByLabelText("Seleccionar logo");
    await user.upload(
      fileInput,
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], "too-large.png", {
        type: "image/png",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("no puede superar 2 MB");

    await user.upload(
      fileInput,
      new File(["valid-logo"], "logo-centro.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Subir logo" }));

    expect(await screen.findByText("Logo configurado")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Logo de Centro de Vida Demo" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Logo cargado correctamente");

    await user.click(screen.getByRole("button", { name: "Retirar logo" }));

    expect(await screen.findByText("Logo pendiente")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Logo retirado");
    expect(revokeObjectUrl).toHaveBeenCalled();
  });

  it("shows controlled conflict errors from BackOffice mutations", async () => {
    server.use(
      mockAuthMe(superAdminUserFixture),
      http.post("http://localhost:3001/api/backoffice/tenants", () =>
        HttpResponse.json({ message: "Ya existe un tenant con ese documento." }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();

    renderAppAtPath("/backoffice/tenants/new");

    expect(await screen.findByRole("heading", { name: "Nuevo tenant" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Nombre del centro"), "Centro Repetido");
    await user.type(screen.getByLabelText("Número de documento"), "900123456");
    await user.type(screen.getByLabelText("Nombre completo"), "Propietario Repetido");
    await user.type(screen.getByLabelText("Correo de acceso"), "propietario@repetido.test");
    await user.type(screen.getByLabelText("Contraseña inicial"), "Cuidarte123!");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya existe un tenant con ese documento.",
    );
  });
});
