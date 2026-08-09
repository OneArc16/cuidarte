import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  auditorUserFixture,
  authUserFixture,
  empleadoFixture,
} from "../../test/fixtures";
import { server } from "../../test/test-server";
import { renderAppAtPath, resetAppTestState } from "../../test/helpers/app-test.helpers";
import { mockAuthMe } from "../../test/helpers/msw-auth.helpers";

type EmpleadoMutationPayload = {
  tenantId?: string | null;
  firstName?: string;
  middleName?: string;
  firstSurname?: string;
  secondSurname?: string;
  email?: string;
  documentNumber?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
  password?: string;
};

describe("App empleados flow", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows Gestion de empleados with icon-only view and edit actions", async () => {
    server.use(mockAuthMe(authUserFixture));
    renderAppAtPath("/gestion-empleados");

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
    server.use(mockAuthMe(authUserFixture));
    const user = userEvent.setup();
    renderAppAtPath("/gestion-empleados");

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
    server.use(mockAuthMe(authUserFixture));
    let createPayload: EmpleadoMutationPayload | null = null;
    server.use(
      http.post("http://localhost:3001/api/empleados", async ({ request }) => {
        createPayload = (await request.json()) as EmpleadoMutationPayload;

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
    const user = userEvent.setup();
    renderAppAtPath("/gestion-empleados/new");

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
    server.use(mockAuthMe(authUserFixture));
    let updatePayload: EmpleadoMutationPayload | null = null;
    server.use(
      http.patch("http://localhost:3001/api/empleados/:empleadoId", async ({ request }) => {
        updatePayload = (await request.json()) as EmpleadoMutationPayload;

        return HttpResponse.json({
          ...empleadoFixture,
          phone: "3125553030",
          isActive: false,
        });
      }),
    );
    const user = userEvent.setup();
    renderAppAtPath(`/gestion-empleados/${empleadoFixture.id}/edit`);

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

  it("shows the active signer state and lets a director deactivate their signature", async () => {
    const directorDetail = {
      ...empleadoFixture,
      role: "director" as const,
      latestSignature: {
        id: "dc8e2c42-8f96-4f19-b204-adf90e139bf4",
        originalName: "firma-vigente.jpeg",
        mimeType: "image/jpeg",
        sizeBytes: 2048,
        createdAt: "2026-07-22T19:20:34.531Z",
      },
      tenantActiveSigner: {
        tenantId: empleadoFixture.tenantId,
        employeeId: empleadoFixture.id,
        signatureVersionId: "dc8e2c42-8f96-4f19-b204-adf90e139bf4",
        activatedByUserId: authUserFixture.id,
        activatedAt: "2026-07-22T19:20:34.531Z",
        updatedAt: "2026-07-22T19:20:34.531Z",
      },
    };
    let currentActiveSigner = directorDetail.tenantActiveSigner;
    let clearSignerCalled = false;
    server.use(
      mockAuthMe(authUserFixture),
      http.get("http://localhost:3001/api/empleados/:empleadoId", () =>
        HttpResponse.json({
          ...directorDetail,
          tenantActiveSigner: currentActiveSigner,
        }),
      ),
      http.get("http://localhost:3001/api/empleados/:empleadoId/signature/file", () =>
        new HttpResponse(new Blob(["signature-preview"], { type: "image/jpeg" }), {
          headers: { "Content-Type": "image/jpeg" },
        }),
      ),
      http.delete("http://localhost:3001/api/tenants/:tenantId/active-signer", async () => {
        clearSignerCalled = true;
        currentActiveSigner = null;

        return HttpResponse.json({
          activeSigner: null,
        });
      }),
    );

    const user = userEvent.setup();
    renderAppAtPath(`/gestion-empleados/${empleadoFixture.id}/edit`);

    expect(await screen.findByText("Firmante activo del centro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desactivar firmante" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Desactivar firmante" }));
    await waitFor(() => expect(clearSignerCalled).toBe(true));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Activar firmante" })).toBeInTheDocument(),
    );
    expect(screen.getByText("firma-vigente.jpeg")).toBeInTheDocument();
  });

  it("lets a director activate their latest signature when the center has no firmante activo", async () => {
    const directorDetail = {
      ...empleadoFixture,
      role: "director" as const,
      latestSignature: {
        id: "dc8e2c42-8f96-4f19-b204-adf90e139bf4",
        originalName: "firma-vigente.jpeg",
        mimeType: "image/jpeg",
        sizeBytes: 2048,
        createdAt: "2026-07-22T19:20:34.531Z",
      },
      tenantActiveSigner: null,
    };
    let currentActiveSigner = directorDetail.tenantActiveSigner;
    let activeSignerPayload: unknown = null;
    server.use(
      mockAuthMe(authUserFixture),
      http.get("http://localhost:3001/api/empleados/:empleadoId", () =>
        HttpResponse.json({
          ...directorDetail,
          tenantActiveSigner: currentActiveSigner,
        }),
      ),
      http.get("http://localhost:3001/api/empleados/:empleadoId/signature/file", () =>
        new HttpResponse(new Blob(["signature-preview"], { type: "image/jpeg" }), {
          headers: { "Content-Type": "image/jpeg" },
        }),
      ),
      http.put("http://localhost:3001/api/tenants/:tenantId/active-signer", async ({ request }) => {
        activeSignerPayload = await request.json();
        currentActiveSigner = {
          tenantId: empleadoFixture.tenantId,
          employeeId: empleadoFixture.id,
          signatureVersionId: "dc8e2c42-8f96-4f19-b204-adf90e139bf4",
          activatedByUserId: authUserFixture.id,
          activatedAt: "2026-08-09T12:00:00.000Z",
          updatedAt: "2026-08-09T12:00:00.000Z",
        };

        return HttpResponse.json({
          activeSigner: currentActiveSigner,
        });
      }),
    );

    const user = userEvent.setup();
    renderAppAtPath(`/gestion-empleados/${empleadoFixture.id}/edit`);

    expect(await screen.findByText("Firmante activo del centro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activar firmante" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Activar firmante" }));
    await waitFor(() =>
      expect(activeSignerPayload).toEqual({
        employeeId: empleadoFixture.id,
        signatureVersionId: "dc8e2c42-8f96-4f19-b204-adf90e139bf4",
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Desactivar firmante" })).toBeInTheDocument(),
    );
  });

  it("keeps auditor users in Gestion de empleados with read-only actions", async () => {
    server.use(mockAuthMe(auditorUserFixture));
    renderAppAtPath("/gestion-empleados");

    expect(await screen.findByRole("heading", { name: "Gestion de empleados" })).toBeInTheDocument();
    const navigation = await screen.findByRole("navigation", { name: "Modulos principales" });

    expect(within(navigation).getByRole("button", { name: "Gestión de empleados" })).toBeInTheDocument();
    expect(within(navigation).queryByRole("button", { name: "BackOffice" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Crear usuario" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Ver ${empleadoFixture.fullName}` })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Editar ${empleadoFixture.fullName}` })).not.toBeInTheDocument();
  });
});
