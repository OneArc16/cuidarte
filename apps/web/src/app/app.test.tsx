import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "./app";
import { renderWithProviders } from "../test/render-with-providers";
import {
  adultoMayorFixture,
  alimentacionAdultoOptionFixture,
  alimentacionFixture,
  actividadGrupalDiligenciamientoFixture,
  actividadGrupalFixture,
  actividadGrupalFormOptionsFixture,
  actividadGrupalIntegranteFixture,
  atencionIndividualFixture,
  auditorUserFixture,
  authUserFixture,
  backofficeTenantDetailFixture,
  cie10OptionsFixture,
  directorUserFixture,
  empleadoFixture,
  homeDashboardFixture,
  historiaClinicaFixture,
  medicoUserFixture,
  otherProfessionalAtencionIndividualFixture,
  recreacionistaUserFixture,
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

  it("shows shortcut cards and dashboard indicators on the home screen", async () => {
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Correo"), "admin@centro-demo.test");
    await user.type(screen.getByLabelText("Contrasena"), "Cuidarte123!");
    await user.click(screen.getByRole("button", { name: "Iniciar sesion" }));

    expect(
      await screen.findByRole("heading", { name: authUserFixture.fullName }),
    ).toBeInTheDocument();

    const shortcutsRegion = screen.getByRole("region", { name: "Módulos del sistema" });

    expect(
      within(shortcutsRegion).getByRole("button", { name: "Adultos mayores" }),
    ).toHaveTextContent("468");
    expect(
      within(shortcutsRegion).getByRole("button", { name: "Sesiones grupales" }),
    ).toHaveTextContent("469");
    expect(
      within(shortcutsRegion).getByRole("button", { name: "Registro de alimentación" }),
    ).toHaveTextContent("140");
    expect(
      within(shortcutsRegion).getByRole("button", { name: "Gestión de empleados" }),
    ).toHaveTextContent("42");
    expect(
      within(shortcutsRegion).queryByRole("button", { name: "BackOffice" }),
    ).not.toBeInTheDocument();

    const indicatorsRegion = screen.getByRole("region", { name: "Resumen operativo" });

    expect(
      within(indicatorsRegion).getByRole("button", { name: "Adultos registrados" }),
    ).toHaveTextContent(String(homeDashboardFixture.indicators[0].total));
    expect(
      within(indicatorsRegion).getByRole("button", { name: "Raciones entregadas" }),
    ).toHaveTextContent("123.200");
    expect(
      within(indicatorsRegion).getByRole("button", { name: "Fisioterapia" }),
    ).toHaveTextContent("56");
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

  it("opens the individual attention form from the adultos mayores shortcut", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: medicoUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/adultos-mayores");
    const user = userEvent.setup();

    renderWithProviders(<App />);

    const shortcut = await screen.findByRole("button", {
      name: `Atencion individual de ${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
    });
    await user.click(shortcut);

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        `/adultos-mayores/${adultoMayorFixture.id}/atenciones/new`,
      );
    });
    expect(await screen.findByText("Nueva atencion individual")).toBeInTheDocument();
    expect(screen.getByText(atencionIndividualFixture.adultoMayor.fullName)).toBeInTheDocument();
    expect(screen.getByLabelText("Consecutivo")).toHaveValue(1);
  });

  it("opens historia clinica for a professional and shows only editable owned attentions", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: medicoUserFixture }),
      ),
      http.get(
        "http://localhost:3001/api/atenciones-individuales/adultos-mayores/:adultoMayorId/history",
        () =>
          HttpResponse.json({
            adultoMayor: historiaClinicaFixture.adultoMayor,
            atenciones: [historiaClinicaFixture.atenciones[0]],
          }),
      ),
    );
    window.history.replaceState({}, "", "/adultos-mayores");
    const user = userEvent.setup();

    renderWithProviders(<App />);

    const shortcut = await screen.findByRole("button", {
      name: `Historia clinica de ${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
    });
    await user.click(shortcut);

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        `/adultos-mayores/${adultoMayorFixture.id}/historia-clinica`,
      );
    });
    expect(await screen.findByText("Seguimiento clinico")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva atencion" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver" })).not.toBeInTheDocument();
  });

  it("opens historia clinica for admin users and reuses the attention view in read-only mode", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
      http.get(
        "http://localhost:3001/api/atenciones-individuales/adultos-mayores/:adultoMayorId/history",
        () =>
          HttpResponse.json({
            adultoMayor: historiaClinicaFixture.adultoMayor,
            atenciones: [
              {
                ...historiaClinicaFixture.atenciones[1],
                access: "view",
              },
            ],
          }),
      ),
      http.get("http://localhost:3001/api/atenciones-individuales/:atencionId", () =>
        HttpResponse.json(otherProfessionalAtencionIndividualFixture),
      ),
    );
    window.history.replaceState({}, "", "/adultos-mayores");
    const user = userEvent.setup();

    renderWithProviders(<App />);

    const shortcut = await screen.findByRole("button", {
      name: `Historia clinica de ${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
    });
    await user.click(shortcut);

    expect(await screen.findByText("Seguimiento clinico")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nueva atencion" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        `/adultos-mayores/${adultoMayorFixture.id}/atenciones/${otherProfessionalAtencionIndividualFixture.id}`,
      );
    });
    expect(
      await screen.findByText("Vista de solo lectura. Esta atencion pertenece a otro profesional."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar atencion" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver" })).toBeInTheDocument();
  });

  it("keeps historia clinica disabled for unsupported roles", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: recreacionistaUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/adultos-mayores");

    renderWithProviders(<App />);

    expect(
      await screen.findByRole("heading", { name: "Listado de adultos mayores" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `Historia clinica de ${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
      }),
    ).toBeDisabled();
  });

  it("searches CIE-10 by code or name from the diagnostics tab", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: { ...authUserFixture, role: "medico" } }),
      ),
    );
    let createPayload: unknown = null;
    server.use(
      http.post("http://localhost:3001/api/atenciones-individuales", async ({ request }) => {
        createPayload = await request.json();

        return HttpResponse.json({
          ...atencionIndividualFixture,
          ...(createPayload as Record<string, unknown>),
          diagnosticos: [
            {
              id: "diagnostico-1",
              codigoCie10: cie10OptionsFixture[0].code,
              descripcion: cie10OptionsFixture[0].title,
              tipo: "principal",
            },
          ],
        });
      }),
    );
    window.history.replaceState({}, "", `/adultos-mayores/${adultoMayorFixture.id}/atenciones/new`);
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(await screen.findByText("Nueva atencion individual")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Motivo de consulta"), "Dolor en mano derecha");
    await user.type(screen.getByLabelText("Enfermedad actual"), "Paciente estable en seguimiento.");
    await user.click(screen.getByRole("tab", { name: "Diagnosticos" }));

    const cie10Input = screen.getByLabelText("Buscar CIE-10");

    await user.type(cie10Input, "g56");
    expect(
      await screen.findByRole("button", { name: /G56\.0 SINDROME DEL TUNEL CARPIANO/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /G56\.0 SINDROME DEL TUNEL CARPIANO/i }));
    expect(screen.getByDisplayValue(cie10OptionsFixture[0].title)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar atencion" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        `/adultos-mayores/${adultoMayorFixture.id}/atenciones/${atencionIndividualFixture.id}`,
      );
    });
    expect(createPayload).toMatchObject({
      diagnosticos: [
        {
          codigoCie10: "G56.0",
          descripcion: cie10OptionsFixture[0].title,
          tipo: "principal",
        },
      ],
    });
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
    expect(screen.getByRole("button", { name: `Editar ${empleadoFixture.fullName}` })).toHaveClass(
      "empleados-row-action",
    );
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

  it("keeps auditor users in Gestion de empleados with read-only actions", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: auditorUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/gestion-empleados");

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Gestion de empleados" })).toBeInTheDocument();
    const navigation = await screen.findByRole("navigation", { name: "Modulos principales" });

    expect(within(navigation).getByRole("button", { name: "Gestión de empleados" })).toBeInTheDocument();
    expect(within(navigation).queryByRole("button", { name: "BackOffice" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Crear usuario" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Ver ${empleadoFixture.fullName}` })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Editar ${empleadoFixture.fullName}` })).not.toBeInTheDocument();
  });

  it("redirects auditor users away from create empleados routes", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: auditorUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/gestion-empleados/new");

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/gestion-empleados");
    });
  });

  it("redirects auditor users away from edit empleados routes", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: auditorUserFixture }),
      ),
    );
    window.history.replaceState({}, "", `/gestion-empleados/${empleadoFixture.id}/edit`);

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/gestion-empleados");
    });
  });

  it("redirects auditor users away from create alimentacion routes", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: auditorUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/registro-alimentacion/new");

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/registro-alimentacion");
    });
  });

  it("redirects auditor users away from create actividades routes", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: auditorUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/creacion-actividades/new");

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/creacion-actividades");
    });
  });

  it("redirects auditor users away from create adultos mayores routes", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: auditorUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/adultos-mayores/new");

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/adultos-mayores");
    });
  });

  it("redirects unsupported roles away from Registro de alimentación and hides the module", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: medicoUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/registro-alimentacion");

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/home");
    });
    const navigation = await screen.findByRole("navigation", { name: "Modulos principales" });

    expect(
      within(navigation).queryByRole("button", { name: "Registro de alimentación" }),
    ).not.toBeInTheDocument();
  });

  it("hides the feeding shortcut in Adultos mayores for unsupported roles", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: medicoUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/adultos-mayores");

    renderWithProviders(<App />);

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
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
      http.get(
        "http://localhost:3001/api/registro-alimentacion/adultos-mayores/:adultoMayorId/lookup",
        () =>
          HttpResponse.json({
            adultoMayor: alimentacionAdultoOptionFixture,
            existingRecordId: null,
          }),
      ),
    );
    window.history.replaceState({}, "", "/adultos-mayores");
    const user = userEvent.setup();

    renderWithProviders(<App />);

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

  it("shows the activities list when navigating to Sesiones grupales", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/creacion-actividades");

    renderWithProviders(<App />);

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: actividadGrupalFixture.activityName }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear actividad" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `Diligenciar actividad ${actividadGrupalFixture.activityName}`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `Descargar acta 0004`,
      }),
    ).toBeInTheDocument();
  });

  it("opens the diligenciamiento page from the activities list", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
      http.get("http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento", () =>
        HttpResponse.json(actividadGrupalDiligenciamientoFixture),
      ),
    );
    window.history.replaceState({}, "", "/creacion-actividades");
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(
      await screen.findByRole("button", { name: actividadGrupalFixture.activityName }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: actividadGrupalFixture.activityName }));

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        `/creacion-actividades/${actividadGrupalFixture.id}/diligenciamiento`,
      );
    });
    expect(await screen.findByText("Profesionales asignados")).toBeInTheDocument();
    expect(
      screen.queryByDisplayValue(actividadGrupalDiligenciamientoFixture.activityName),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar diligenciamiento" })).toBeInTheDocument();
  });

  it("filters the activities list by type", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/creacion-actividades");
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(await screen.findByText(actividadGrupalFixture.activityName)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Tipo de actividad"), "nutricion");

    await waitFor(() => {
      expect(screen.queryByText(actividadGrupalFixture.activityName)).not.toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("Tipo de actividad"), "fisioterapia");

    expect(await screen.findByText(actividadGrupalFixture.activityName)).toBeInTheDocument();
  });

  it("saves a diligenciamiento with integrantes and support files", async () => {
    let receivedContentType: string | null = null;
    let saveRequestCount = 0;
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
      http.get("http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento", () =>
        HttpResponse.json({
          ...actividadGrupalDiligenciamientoFixture,
          objectives: "",
          development: "",
          conclusion: "",
          responsibleDepartment: null,
          integrantes: [],
          photoFiles: [],
          pdfFile: null,
        }),
      ),
      http.get(
        "http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento/integrantes-options",
        () => HttpResponse.json({ integrantes: [actividadGrupalIntegranteFixture] }),
      ),
      http.put(
        "http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento",
        ({ request }) => {
          receivedContentType = request.headers.get("content-type");
          saveRequestCount += 1;

          return HttpResponse.json({
            ...actividadGrupalDiligenciamientoFixture,
            objectives: "Objetivos test",
            development: "Desarrollo test",
            conclusion: "Conclusion test",
            responsibleDepartment: "nutricion",
            integrantes: [actividadGrupalIntegranteFixture],
            photoFiles: [
              {
                id: "123e4567-e89b-42d3-a456-426614174001",
                kind: "support_photo",
                originalName: "evidencia.jpg",
                mimeType: "image/jpeg",
                sizeBytes: 5120,
                createdAt: "2026-04-24T12:00:00.000Z",
              },
            ],
            pdfFile: {
              id: "223e4567-e89b-42d3-a456-426614174099",
              kind: "support_pdf",
              originalName: "soporte-final.pdf",
              mimeType: "application/pdf",
              sizeBytes: 4096,
              createdAt: "2026-04-24T12:00:00.000Z",
            },
            diligenciamientoCreatedAt: "2026-04-24T12:00:00.000Z",
            diligenciamientoUpdatedAt: "2026-04-24T12:00:00.000Z",
          });
        },
      ),
    );
    window.history.replaceState(
      {},
      "",
      `/creacion-actividades/${actividadGrupalFixture.id}/diligenciamiento`,
    );
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(
      await screen.findByRole("button", { name: "Guardar diligenciamiento" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Escribe un nombre o documento para buscar adultos mayores."),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Objetivos"), "Objetivos test");
    await user.type(screen.getByLabelText("Desarrollo"), "Desarrollo test");
    await user.type(screen.getByLabelText("Conclusion"), "Conclusion test");
    await user.selectOptions(screen.getByLabelText("Departamento encargado"), "nutricion");
    await user.type(screen.getByLabelText("Buscar por nombre o documento"), "1020304050");
    await user.click(screen.getByRole("button", { name: /Rosa Elena Martinez Rojas/i }));
    await waitFor(() => {
      const integrantesSeleccionados = screen
        .getByText("Integrantes seleccionados")
        .closest("label");

      expect(integrantesSeleccionados).not.toBeNull();
      expect(
        within(integrantesSeleccionados as HTMLLabelElement).getByText("Rosa Elena Martinez Rojas"),
      ).toBeInTheDocument();
    });
    await user.upload(
      screen.getByLabelText("Agregar fotos de soporte"),
      new File(["photo"], "evidencia.jpg", { type: "image/jpeg" }),
    );
    await user.upload(
      screen.getByLabelText("Adjuntar documento PDF"),
      new File(["pdf"], "soporte-final.pdf", { type: "application/pdf" }),
    );
    await user.click(screen.getByRole("button", { name: "Guardar diligenciamiento" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Diligenciamiento guardado.");
    expect(saveRequestCount).toBe(1);
    expect(receivedContentType).toContain("multipart/form-data");
  });

  it("creates an activity and returns to the list", async () => {
    let createPayload: unknown = null;
    let actividades: Record<string, unknown>[] = [
      actividadGrupalFixture as unknown as Record<string, unknown>,
    ];
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
      http.get("http://localhost:3001/api/actividades-grupales", () =>
        HttpResponse.json({ actividadesGrupales: actividades }),
      ),
      http.get("http://localhost:3001/api/actividades-grupales/form-options", () =>
        HttpResponse.json({
          ...actividadGrupalFormOptionsFixture,
          nextActaNumber: 5,
        }),
      ),
      http.post("http://localhost:3001/api/actividades-grupales", async ({ request }) => {
        createPayload = await request.json();
        actividades = [
          {
            ...actividadGrupalFixture,
            id: "c6027793-39d5-4ff7-a531-65c0fd6ea24b",
            actaNumber: 5,
            activityName: "Actividad creada desde test",
            activityType: "salud_preventiva",
            activityDate: "2026-04-24",
            startTime: "09:00",
            endTime: "11:00",
            organizer: "medico",
          },
        ];

        return HttpResponse.json(actividades[0] ?? {});
      }),
    );
    window.history.replaceState({}, "", "/creacion-actividades/new");
    const user = userEvent.setup();

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Numero de acta/i)).toHaveValue("0005");
    });
    await user.type(screen.getByLabelText("Nombre de la actividad"), "Actividad creada desde test");
    await user.selectOptions(screen.getByLabelText("Tipo de actividad"), "salud_preventiva");
    await user.type(screen.getByLabelText("Fecha de la actividad"), "2026-04-24");
    await user.type(screen.getByLabelText("Hora de inicio"), "09:00");
    await user.type(screen.getByLabelText("Hora final"), "11:00");
    await user.selectOptions(screen.getByLabelText("Organizador"), "medico");
    await user.click(screen.getByRole("checkbox", { name: /Laura Natalia Perez Ruiz/i }));
    await user.click(screen.getByRole("button", { name: "Guardar actividad" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/creacion-actividades");
    });
    expect(await screen.findByText("Actividad creada desde test")).toBeInTheDocument();
    expect(createPayload).toMatchObject({
      tenantId: null,
      activityName: "Actividad creada desde test",
      activityType: "salud_preventiva",
      activityDate: "2026-04-24",
      startTime: "09:00",
      endTime: "11:00",
      organizer: "medico",
      employeeIds: [empleadoFixture.id],
    });
  });

  it("shows the feeding list when navigating to Registro de alimentación", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/registro-alimentacion");

    renderWithProviders(<App />);

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: alimentacionFixture.fullName }),
    ).toBeInTheDocument();
    expect(screen.getByText("Entregado")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Agregar registro de alimentación" }),
    ).toBeInTheDocument();
  });

  it("allows director users to access Registro de alimentación", async () => {
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: directorUserFixture }),
      ),
    );
    window.history.replaceState({}, "", "/registro-alimentacion");

    renderWithProviders(<App />);

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: alimentacionFixture.fullName }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Agregar registro de alimentación" }),
    ).toBeInTheDocument();
  });

  it("creates a feeding batch and returns to the list", async () => {
    let createPayload: unknown = null;
    let registros = [alimentacionFixture];
    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({ user: authUserFixture }),
      ),
      http.get("http://localhost:3001/api/registro-alimentacion", ({ request }) => {
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
        createPayload = await request.json();
        registros = [
          {
            ...alimentacionFixture,
            deliveryDate: "2026-04-24",
          },
        ];

        return HttpResponse.json({ createdCount: 1 });
      }),
    );
    window.history.replaceState({}, "", "/registro-alimentacion/new");
    const user = userEvent.setup();

    renderWithProviders(<App />);

    await user.clear(screen.getByLabelText("Fecha"));
    await user.type(screen.getByLabelText("Fecha"), "2026-04-24");
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
      tenantId: null,
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

    ["Inicio", "Adultos mayores", "Sesiones grupales"].forEach((moduleLabel) => {
      expect(
        within(mobileNavigation).getByRole("button", { name: moduleLabel }),
      ).toBeInTheDocument();
    });
    expect(
      within(mobileNavigation).queryByRole("button", { name: "Creación de actividades" }),
    ).not.toBeInTheDocument();
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
    "Registro de alimentación",
    "Gestión de empleados",
  ].forEach((moduleLabel) => {
    expect(within(navigation).getByRole("button", { name: moduleLabel })).toBeInTheDocument();
  });
  expect(
    within(navigation).queryByRole("button", { name: "Creación de actividades" }),
  ).not.toBeInTheDocument();
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
