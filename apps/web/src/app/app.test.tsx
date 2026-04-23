import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "./app";
import { renderWithProviders } from "../test/render-with-providers";
import {
  adultoMayorFixture,
  authUserFixture,
  backofficeTenantDetailFixture,
  empleadoFixture,
  server,
  superAdminUserFixture,
} from "../test/test-server";

describe("App auth routing", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rotates login slogans below the CuidarTe heading", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    renderWithProviders(<App />);

    expect(await screen.findByText("Porque cada día importa.")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4200);
    });

    expect(screen.getByText("Salud, alegría y bienestar en un solo lugar.")).toBeInTheDocument();
  });

  it("shows remember password and toggles password visibility", async () => {
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    const rememberPassword = screen.getByLabelText("Recordar contrasena");

    expect(rememberPassword).not.toBeChecked();
    await user.click(rememberPassword);
    expect(rememberPassword).toBeChecked();

    const passwordInput = screen.getByLabelText("Contrasena");

    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Mostrar contrasena" }));
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Ocultar contrasena" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("redirects a signed-in user to home and logs out back to login", async () => {
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });

    await user.type(screen.getByLabelText("Correo"), "admin@centro-demo.test");
    await user.type(screen.getByLabelText("Contrasena"), "Cuidarte123!");
    await user.click(screen.getByLabelText("Recordar contrasena"));
    await user.click(screen.getByRole("button", { name: "Iniciar sesion" }));

    expect(
      await screen.findByRole("heading", { name: authUserFixture.fullName }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/home");
    });
    expect(window.localStorage.getItem("cuidarte.login.email")).toBe("admin@centro-demo.test");
    expect(
      screen.getByRole("complementary", { name: "Menu principal de CuidarTe" }),
    ).toBeInTheDocument();
    const loggedUser = screen.getByRole("region", { name: "Usuario logueado" });

    expect(loggedUser).toHaveTextContent(authUserFixture.fullName);
    expect(loggedUser).toHaveTextContent("Admin");
    expect(screen.getAllByText("CuidarTe")).not.toHaveLength(0);

    const navigation = screen.getByRole("navigation", { name: "Modulos principales" });

    expect(within(navigation).getByRole("button", { name: "Inicio" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expectBaseModules(navigation);
    expect(
      within(navigation).queryByRole("button", { name: "BackOffice" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar sesion" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });
    expect(screen.getByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
  });

  it("shows an accessible error when credentials are rejected", async () => {
    server.use(
      http.post("http://localhost:3001/api/auth/login", () =>
        HttpResponse.json({ message: "Unauthorized" }, { status: 401 }),
      ),
    );
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Correo"));
    await user.type(screen.getByLabelText("Correo"), "admin@centro-demo.test");
    await user.clear(screen.getByLabelText("Contrasena"));
    await user.type(screen.getByLabelText("Contrasena"), "incorrecta");
    await user.click(screen.getByRole("button", { name: "Iniciar sesion" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contrasena incorrectos.");
  });

  it("shows BackOffice in the sidebar for super admin users", async () => {
    server.use(
      http.post("http://localhost:3001/api/auth/login", () =>
        HttpResponse.json({
          user: superAdminUserFixture,
        }),
      ),
    );
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Correo"), "superadmin@cuidarte.test");
    await user.type(screen.getByLabelText("Contrasena"), "Cuidarte123!");
    await user.click(screen.getByRole("button", { name: "Iniciar sesion" }));

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

  it("redirects tenant admins away from BackOffice routes", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/backoffice");

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/home");
    });
    expect(
      await screen.findByRole("heading", { name: authUserFixture.fullName }),
    ).toBeInTheDocument();
  });

  it("shows the BackOffice tenant table for SuperAdmin users", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: superAdminUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/backoffice");

    const { container } = renderWithProviders(<App />);

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
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: superAdminUserFixture }),
      ),
    );
    let createPayload: unknown = null;
    server.use(
      http.post("http://localhost:3001/api/backoffice/tenants", async ({ request }) => {
        createPayload = await request.json();

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
    window.history.replaceState({}, "", "/backoffice/tenants/new");
    const user = userEvent.setup();

    const { container } = renderWithProviders(<App />);

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
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: superAdminUserFixture }),
      ),
    );
    let updatePayload: unknown = null;
    server.use(
      http.patch("http://localhost:3001/api/backoffice/tenants/:tenantId", async ({ request }) => {
        updatePayload = await request.json();

        return HttpResponse.json({
          tenant: {
            ...backofficeTenantDetailFixture.tenant,
            name: "Centro Demo Editado",
          },
          owner: backofficeTenantDetailFixture.owner,
        });
      }),
    );
    window.history.replaceState(
      {},
      "",
      `/backoffice/tenants/${backofficeTenantDetailFixture.tenant.id}`,
    );
    const user = userEvent.setup();

    renderWithProviders(<App />);

    const nameInput = await screen.findByLabelText("Nombre del centro");

    await user.clear(nameInput);
    await user.type(nameInput, "Centro Demo Editado");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Cambios guardados.");
    expect(updatePayload).toMatchObject({
      tenant: {
        name: "Centro Demo Editado",
      },
      owner: {
        email: backofficeTenantDetailFixture.owner.email,
      },
    });
    expect((updatePayload as { owner?: { password?: unknown } }).owner?.password).toBeUndefined();
  });

  it("shows controlled conflict errors from BackOffice mutations", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: superAdminUserFixture }),
      ),
      http.post("http://localhost:3001/api/backoffice/tenants", () =>
        HttpResponse.json({ message: "Ya existe un tenant con ese documento." }, { status: 409 }),
      ),
    );
    window.history.replaceState({}, "", "/backoffice/tenants/new");
    const user = userEvent.setup();

    renderWithProviders(<App />);

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

  it("navigates to Adultos mayores and shows the tenant scoped table", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/home");
    const user = userEvent.setup();

    renderWithProviders(<App />);

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
    ).toBeDisabled();
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
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Crear adulto mayor" })).toHaveClass(
      "adultos-floating-action",
    );
  });

  it("creates an adulto mayor from the tabbed form", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
    );
    let createPayload: unknown = null;
    server.use(
      http.post("http://localhost:3001/api/adultos-mayores", async ({ request }) => {
        createPayload = await request.json();

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
    window.history.replaceState({}, "", "/adultos-mayores/new");
    const user = userEvent.setup();

    renderWithProviders(<App />);

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
    await user.type(screen.getByLabelText("Departamento"), "Cundinamarca");
    await user.type(screen.getByLabelText("Municipio"), "Bogota");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        "/adultos-mayores/25ce51a5-f0a6-4374-a6b4-815348cbd26d/edit",
      );
    });
    expect(createPayload).toMatchObject({
      documentType: "cc",
      documentNumber: "1099887766",
      firstName: "Julia",
      middleName: "Mercedes",
      firstSurname: "Lopez",
      secondSurname: "Cano",
      country: "Colombia",
    });
  });

  it("edits an adulto mayor from the reusable form", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
    );
    let updatePayload: unknown = null;
    server.use(
      http.patch(
        "http://localhost:3001/api/adultos-mayores/:adultoMayorId",
        async ({ request }) => {
          updatePayload = await request.json();

          return HttpResponse.json({
            ...adultoMayorFixture,
            names: "Rosa Maria",
            middleName: "Maria",
          });
        },
      ),
    );
    window.history.replaceState({}, "", `/adultos-mayores/${adultoMayorFixture.id}/edit`);
    const user = userEvent.setup();

    renderWithProviders(<App />);

    const secondNameInput = await screen.findByLabelText("Segundo nombre");

    await user.clear(secondNameInput);
    await user.type(secondNameInput, "Maria");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Cambios guardados.");
    expect(updatePayload).toMatchObject({
      documentNumber: adultoMayorFixture.documentNumber,
      firstName: "Rosa",
      middleName: "Maria",
      firstSurname: "Martinez",
    });
  });

  it("shows the Centro column for SuperAdmin users in Adultos mayores", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: superAdminUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/adultos-mayores");

    renderWithProviders(<App />);

    expect(
      await screen.findByRole("heading", { name: "Listado de adultos mayores" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Centro" })).toBeInTheDocument();
    expect(await screen.findByText(adultoMayorFixture.tenantName)).toBeInTheDocument();
  });

  it("exports and prints Adultos mayores using the current search", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
    );
    let excelSearch: string | null = null;
    let pdfSearch: string | null = null;

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
    window.history.replaceState({}, "", "/adultos-mayores");
    const user = userEvent.setup();

    renderWithProviders(<App />);

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

    await user.click(screen.getByRole("button", { name: "Imprimir listado" }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("shows Gestion de empleados with icon-only view and edit actions", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/gestion-empleados");

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Gestion de empleados" })).toHaveClass(
      "visually-hidden",
    );
    expect(screen.queryByRole("columnheader", { name: "Centro" })).not.toBeInTheDocument();
    expect(await screen.findByText(empleadoFixture.documentNumber)).toBeInTheDocument();
    expect(screen.getByText(empleadoFixture.fullName)).toBeInTheDocument();
    expect(screen.getByText(empleadoFixture.email)).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Ver ${empleadoFixture.fullName}` })).toHaveClass(
      "empleados-row-action",
    );
    expect(
      screen.getByRole("button", { name: `Editar ${empleadoFixture.fullName}` }),
    ).toHaveClass("empleados-row-action");
    expect(screen.getByRole("button", { name: "Crear usuario" })).toHaveClass(
      "empleados-floating-action",
    );
  });

  it("opens employee details in a modal", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/gestion-empleados");
    const user = userEvent.setup();

    renderWithProviders(<App />);

    await user.click(
      await screen.findByRole("button", { name: `Ver ${empleadoFixture.fullName}` }),
    );

    const detailDialog = await screen.findByRole("dialog", { name: empleadoFixture.fullName });

    expect(detailDialog).toBeInTheDocument();
    expect(within(detailDialog).getByText("Medico")).toBeInTheDocument();
    expect(within(detailDialog).getByText("Activo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar detalle" })).toBeInTheDocument();
  });

  it("creates an employee from the reusable form", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
    );
    let createPayload: unknown = null;
    server.use(
      http.post("http://localhost:3001/api/empleados", async ({ request }) => {
        createPayload = await request.json();

        return HttpResponse.json({
          ...empleadoFixture,
          id: "d82f34b1-26d6-40b2-8980-fb63f5d6ac6b",
          documentNumber: "2020202020",
          fullName: "Carlos Andres Mora Diaz",
          firstName: "Carlos",
          middleName: "Andres",
          firstSurname: "Mora",
          secondSurname: "Diaz",
          email: "carlos.mora@centro-demo.test",
          role: "admin",
          isActive: false,
        });
      }),
    );
    window.history.replaceState({}, "", "/gestion-empleados/new");
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Nuevo usuario" })).toHaveClass(
      "visually-hidden",
    );
    await user.type(screen.getByLabelText("Primer nombre"), "Carlos");
    await user.type(screen.getByLabelText("Segundo nombre"), "Andres");
    await user.type(screen.getByLabelText("Primer apellido"), "Mora");
    await user.type(screen.getByLabelText("Segundo apellido"), "Diaz");
    await user.type(screen.getByLabelText("Correo electronico"), "carlos.mora@centro-demo.test");
    await user.type(screen.getByLabelText("Numero de documento"), "2020202020");
    await user.type(screen.getByLabelText("Telefono"), "3115552020");
    await user.selectOptions(screen.getByLabelText("Tipo de usuario"), "admin");
    await user.click(screen.getByRole("button", { name: /Inactivar usuario/i }));
    await user.type(screen.getByLabelText("Contrasena"), "Cuidarte123!");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        "/gestion-empleados/d82f34b1-26d6-40b2-8980-fb63f5d6ac6b/edit",
      );
    });
    expect(createPayload).toMatchObject({
      tenantId: null,
      firstName: "Carlos",
      middleName: "Andres",
      firstSurname: "Mora",
      secondSurname: "Diaz",
      email: "carlos.mora@centro-demo.test",
      documentNumber: "2020202020",
      phone: "3115552020",
      role: "admin",
      isActive: false,
      password: "Cuidarte123!",
    });
  });

  it("edits an employee without sending a password when it is left blank", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
    );
    let updatePayload: unknown = null;
    server.use(
      http.patch("http://localhost:3001/api/empleados/:empleadoId", async ({ request }) => {
        updatePayload = await request.json();

        return HttpResponse.json({
          ...empleadoFixture,
          phone: "3125553030",
          isActive: false,
        });
      }),
    );
    window.history.replaceState({}, "", `/gestion-empleados/${empleadoFixture.id}/edit`);
    const user = userEvent.setup();

    renderWithProviders(<App />);

    const phoneInput = await screen.findByLabelText("Telefono");

    await user.clear(phoneInput);
    await user.type(phoneInput, "3125553030");
    await user.click(screen.getByRole("button", { name: /Inactivar usuario/i }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Cambios guardados.");
    expect(updatePayload).toMatchObject({
      firstName: empleadoFixture.firstName,
      middleName: empleadoFixture.middleName,
      firstSurname: empleadoFixture.firstSurname,
      secondSurname: empleadoFixture.secondSurname,
      email: empleadoFixture.email,
      documentNumber: empleadoFixture.documentNumber,
      phone: "3125553030",
      role: empleadoFixture.role,
      isActive: false,
    });
    expect(updatePayload).not.toHaveProperty("password");
  });

  it("redirects professional roles away from Gestion de empleados", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({
          user: {
            ...authUserFixture,
            fullName: "Medico Centro Demo",
            role: "medico",
          },
        }),
      ),
    );
    window.history.replaceState({}, "", "/gestion-empleados");

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/home");
    });
    const navigation = await screen.findByRole("navigation", { name: "Modulos principales" });

    expect(
      within(navigation).queryByRole("button", { name: "Gestión de empleados" }),
    ).not.toBeInTheDocument();
  });

  it("uses a mobile bottom navigation with a more modules sheet", async () => {
    vi.stubGlobal("matchMedia", createMatchMedia(true));
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Correo"), "admin@centro-demo.test");
    await user.type(screen.getByLabelText("Contrasena"), "Cuidarte123!");
    await user.click(screen.getByRole("button", { name: "Iniciar sesion" }));

    expect(
      await screen.findByRole("heading", { name: authUserFixture.fullName }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "Menu principal de CuidarTe" }),
    ).not.toBeInTheDocument();

    const mobileNavigation = screen.getByRole("navigation", { name: "Navegacion movil" });

    ["Inicio", "Adultos mayores", "Sesiones grupales", "Creación de actividades"].forEach(
      (moduleLabel) => {
        expect(
          within(mobileNavigation).getByRole("button", { name: moduleLabel }),
        ).toBeInTheDocument();
      },
    );
    expect(
      within(mobileNavigation).queryByRole("button", { name: "Registro de alimentación" }),
    ).not.toBeInTheDocument();

    const moreButton = within(mobileNavigation).getByRole("button", { name: "Más" });

    expect(moreButton).toHaveAttribute("aria-expanded", "false");
    await user.click(moreButton);
    expect(moreButton).toHaveAttribute("aria-expanded", "true");

    const moreSheet = await screen.findByRole("dialog", { name: "Más módulos" });

    expect(
      within(moreSheet).getByRole("button", { name: "Registro de alimentación" }),
    ).toBeInTheDocument();
    expect(
      within(moreSheet).getByRole("button", { name: "Gestión de empleados" }),
    ).toBeInTheDocument();
    expect(within(moreSheet).queryByRole("button", { name: "BackOffice" })).not.toBeInTheDocument();
    expect(within(moreSheet).getByRole("button", { name: "Cerrar sesion" })).toBeInTheDocument();
  });
});

function expectBaseModules(navigation: HTMLElement) {
  [
    "Inicio",
    "Adultos mayores",
    "Sesiones grupales",
    "Creación de actividades",
    "Registro de alimentación",
    "Gestión de empleados",
  ].forEach((moduleLabel) => {
    expect(within(navigation).getByRole("button", { name: moduleLabel })).toBeInTheDocument();
  });
}

function createMatchMedia(matches: boolean) {
  return (query: string): MediaQueryList =>
    ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as MediaQueryList;
}
