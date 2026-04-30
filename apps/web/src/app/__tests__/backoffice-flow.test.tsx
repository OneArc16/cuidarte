import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  backofficeTenantDetailFixture,
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
    await user.type(screen.getByLabelText("Ciudad"), "Medellin");
    await user.type(screen.getByLabelText("Departamento"), "Antioquia");
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
