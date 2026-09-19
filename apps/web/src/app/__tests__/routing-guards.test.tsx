import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";

import {
  auditorUserFixture,
  authUserFixture,
  directorUserFixture,
  empleadoFixture,
  enfermeriaUserFixture,
  medicoUserFixture,
} from "../../test/fixtures";
import { server } from "../../test/test-server";
import { renderAppAtPath, resetAppTestState } from "../../test/helpers/app-test.helpers";
import { mockAuthMe } from "../../test/helpers/msw-auth.helpers";

describe("App routing guards", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("redirects tenant admins away from BackOffice routes", async () => {
    server.use(mockAuthMe(authUserFixture));

    renderAppAtPath("/backoffice");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/home");
    });
    expect(
      await screen.findByRole("heading", { name: authUserFixture.fullName }),
    ).toBeInTheDocument();
  });

  it("redirects professional roles away from Gestion de empleados", async () => {
    server.use(
      mockAuthMe({
        ...authUserFixture,
        fullName: "Medico Centro Demo",
        role: "medico",
      }),
    );

    renderAppAtPath("/gestion-empleados");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/home");
    });
    const navigation = await screen.findByRole("navigation", { name: "Modulos principales" });

    expect(
      within(navigation).queryByRole("button", { name: "Gestión de empleados" }),
    ).not.toBeInTheDocument();
  });

  it("redirects auditor users away from create empleados routes", async () => {
    server.use(mockAuthMe(auditorUserFixture));

    renderAppAtPath("/gestion-empleados/new");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/gestion-empleados");
    });
  });

  it("redirects auditor users away from edit empleados routes", async () => {
    server.use(mockAuthMe(auditorUserFixture));

    renderAppAtPath(`/gestion-empleados/${empleadoFixture.id}/edit`);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/gestion-empleados");
    });
  });

  it("redirects auditor users away from create alimentacion routes", async () => {
    server.use(mockAuthMe(auditorUserFixture));

    renderAppAtPath("/registro-alimentacion/new");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/registro-alimentacion");
    });
  });

  it("redirects auditor users away from create actividades routes", async () => {
    server.use(mockAuthMe(auditorUserFixture));

    renderAppAtPath("/creacion-actividades/new");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/creacion-actividades");
    });
  });

  it("redirects auditor users away from create adultos mayores routes", async () => {
    server.use(mockAuthMe(auditorUserFixture));

    renderAppAtPath("/adultos-mayores/new");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/adultos-mayores");
    });
  });

  it("redirects auditor users away from the adultos mayores import route", async () => {
    server.use(mockAuthMe(auditorUserFixture));

    renderAppAtPath("/adultos-mayores/importar");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/home");
    });
  });

  it("allows director users to open the adultos mayores import route", async () => {
    server.use(mockAuthMe(directorUserFixture));

    renderAppAtPath("/adultos-mayores/importar");

    expect(await screen.findByRole("button", { name: "Descargar plantilla" })).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "Modulos principales" });

    expect(
      within(navigation).queryByRole("button", { name: "Importar adultos mayores" }),
    ).not.toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "Adultos mayores" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(window.location.pathname).toBe("/adultos-mayores/importar");
  });

  it("redirects unsupported roles away from Registro de alimentación and hides the module", async () => {
    server.use(mockAuthMe(medicoUserFixture));

    renderAppAtPath("/registro-alimentacion");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/home");
    });
    const navigation = await screen.findByRole("navigation", { name: "Modulos principales" });

    expect(
      within(navigation).queryByRole("button", { name: "Registro de alimentación" }),
    ).not.toBeInTheDocument();
  });

  it("redirects unsupported roles away from Atenciones de enfermería and hides the module", async () => {
    server.use(
      mockAuthMe({
        ...medicoUserFixture,
        role: "recreacionista",
      }),
    );

    renderAppAtPath("/atenciones-enfermeria");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/home");
    });
    const navigation = await screen.findByRole("navigation", { name: "Modulos principales" });

    expect(
      within(navigation).queryByRole("button", { name: "Enfermería" }),
    ).not.toBeInTheDocument();
  });

  it("allows medical users to access read-only atenciones de enfermería routes", async () => {
    server.use(mockAuthMe(medicoUserFixture));

    renderAppAtPath("/atenciones-enfermeria");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/atenciones-enfermeria");
    });
  });

  it("hides the individual attention action for enfermeria users", async () => {
    server.use(mockAuthMe(enfermeriaUserFixture));

    renderAppAtPath("/adultos-mayores");

    const navigation = await screen.findByRole("navigation", { name: "Modulos principales" });

    expect(
      within(navigation).getByRole("button", { name: "Adultos mayores" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /Atencion individual de /,
      }),
    ).not.toBeInTheDocument();
  });

  it("blocks enfermeria users from direct atencion individual create routes", async () => {
    server.use(mockAuthMe(enfermeriaUserFixture));

    renderAppAtPath("/adultos-mayores/0b17e370-8f81-48c0-b707-c7046f497855/atenciones/new");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/adultos-mayores");
    });
  });
});
