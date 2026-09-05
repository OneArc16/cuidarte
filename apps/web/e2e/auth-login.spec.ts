import { expect, test } from "@playwright/test";

const adminCredentials = {
  email: "admin@centro-demo.test",
  password: "Cuidarte123!",
};

const superAdminCredentials = {
  email: "superadmin@cuidarte.test",
  password: "Cuidarte123!",
};

const e2eApiBaseUrl = `http://127.0.0.1:${process.env.PLAYWRIGHT_API_PORT ?? "3011"}/api`;
const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test.describe("Auth + Login", () => {
  test("permite iniciar sesion, llegar al home y cerrar sesion", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
    await expect(page.getByLabel("Correo")).toBeVisible();
    await expect(page.getByLabel("Contrasena", { exact: true })).toBeVisible();

    await page.getByLabel("Correo").fill(adminCredentials.email);
    await page.getByLabel("Contrasena", { exact: true }).fill(adminCredentials.password);

    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/login") && response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Iniciar sesion" }).click();

    const loginResponse = await loginResponsePromise;
    expect(loginResponse.status()).toBe(200);

    await expect(page).toHaveURL(/\/home$/);
    await expect(
      page.getByRole("complementary", { name: "Menu principal de CuidarTe" }),
    ).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Modulos principales" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Admin Centro Demo" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Usuario logueado" })).toContainText("Admin");
    const primaryNavigation = page.getByRole("navigation", { name: "Modulos principales" });
    await expect(
      primaryNavigation.getByRole("button", { name: "Adultos mayores", exact: true }),
    ).toBeVisible();
    await expect(
      primaryNavigation.getByRole("button", { name: "BackOffice", exact: true }),
    ).toBeHidden();
    await expect(page.getByRole("heading", { name: "Resumen operativo" })).toBeVisible();

    await page.goto("/backoffice");
    await expect(page).toHaveURL(/\/home$/);
    await expect(
      primaryNavigation.getByRole("button", { name: "BackOffice", exact: true }),
    ).toBeHidden();

    const logoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/logout") && response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Cerrar sesion" }).click();

    const logoutResponse = await logoutResponsePromise;
    expect(logoutResponse.status()).toBe(200);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Menu principal de CuidarTe" }),
    ).toBeHidden();
  });

  test("permite a SuperAdmin crear y editar un tenant con propietario", async ({ page }) => {
    const runId = Date.now();
    const tenantName = `Centro E2E ${runId}`;
    const editedTenantName = `Centro E2E Editado ${runId}`;
    const ownerEmail = `propietario-${runId}@centro-e2e.test`;

    await page.goto("/login");
    await page.getByLabel("Correo").fill(superAdminCredentials.email);
    await page.getByLabel("Contrasena", { exact: true }).fill(superAdminCredentials.password);
    await page.getByRole("button", { name: "Iniciar sesion" }).click();

    await expect(page).toHaveURL(/\/home$/);
    const primaryNavigation = page.getByRole("navigation", { name: "Modulos principales" });
    await expect(
      primaryNavigation.getByRole("button", { name: "BackOffice", exact: true }),
    ).toBeVisible();

    await primaryNavigation.getByRole("button", { name: "BackOffice", exact: true }).click();
    await expect(page).toHaveURL(/\/backoffice$/);
    await expect(page.locator(".backoffice-heading")).toHaveCount(0);
    await expect(page.getByRole("table")).toBeVisible();

    const newTenantButton = page.getByRole("button", { name: "Nuevo tenant" });

    await expect(newTenantButton).toBeVisible();
    await expect(newTenantButton).toHaveClass(/backoffice-floating-action/);
    await newTenantButton.click();
    await expect(page).toHaveURL(/\/backoffice\/tenants\/new$/);
    await expect(page.locator(".backoffice-topbar")).toHaveCount(0);
    await expect(page.locator(".backoffice-form-nav .backoffice-back-action")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Volver" })).toHaveClass(
      /backoffice-back-action/,
    );

    await page.getByLabel("Nombre del centro").fill(tenantName);
    await page.getByLabel("Número de documento").fill(`90${runId}`);
    await page.getByLabel("Correo del centro").fill(`contacto-${runId}@centro-e2e.test`);
    await page.getByLabel("Teléfono").fill("6015558899");
    await page.getByLabel("Dirección").fill("Calle 45 # 67-89");
    await page.getByRole("combobox", { name: "Departamento" }).fill("Bogota");
    await page.getByRole("option", { name: /Bogotá, D\.C\./i }).click();
    await page.getByRole("combobox", { name: "Municipio" }).fill("Bogota");
    await page.getByRole("option", { name: /Bogotá, D\.C\./i }).click();
    await page.getByLabel("Nombre completo").fill("Propietario E2E");
    await page.getByLabel("Correo de acceso").fill(ownerEmail);
    await page.getByLabel("Contraseña inicial").fill("Cuidarte123!");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page).toHaveURL(/\/backoffice\/tenants\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: tenantName })).toBeVisible();

    await page.getByLabel("Nombre del centro").fill(editedTenantName);
    const updateTenantResponsePromise = page.waitForResponse(
      (response) =>
        /\/api\/backoffice\/tenants\/[0-9a-f-]+$/.test(response.url()) &&
        response.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Guardar" }).click();

    expect((await updateTenantResponsePromise).status()).toBe(200);
    await expect(page.getByRole("heading", { name: editedTenantName })).toBeVisible();
  });

  test("permite a un admin crear y diligenciar una actividad grupal", async ({ page }) => {
    const runId = Date.now();
    const activityName = `Actividad E2E ${runId}`;

    await page.goto("/login");
    await page.getByLabel("Correo").fill(adminCredentials.email);
    await page.getByLabel("Contrasena", { exact: true }).fill(adminCredentials.password);
    await page.getByRole("button", { name: "Iniciar sesion" }).click();

    await expect(page).toHaveURL(/\/home$/);
    await page
      .getByRole("navigation", { name: "Modulos principales" })
      .getByRole("button", { name: "Sesiones grupales", exact: true })
      .click();
    await expect(page).toHaveURL(/\/creacion-actividades$/);
    await expect(page.getByRole("table")).toBeVisible();

    await page.getByRole("button", { name: "Crear actividad" }).click();
    await expect(page).toHaveURL(/\/creacion-actividades\/new$/);

    await page.getByLabel("Nombre de la actividad").fill(activityName);
    await page.getByLabel("Fecha de la actividad").fill("2026-04-24");
    await page.getByLabel("Hora de inicio").fill("09:00");
    await page.getByLabel("Hora final").fill("11:00");
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "Guardar actividad" }).click();

    await expect(page).toHaveURL(/\/creacion-actividades$/);
    await expect(page.getByText(activityName)).toBeVisible();
    await expect(page.getByRole("button", { name: activityName, exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Diligenciar actividad ${activityName}` }),
    ).toBeVisible();

    await page.getByRole("button", { name: activityName, exact: true }).click();
    await expect(page).toHaveURL(/\/creacion-actividades\/[0-9a-f-]+\/diligenciamiento$/);

    await page.getByLabel("Objetivos").fill("Objetivos E2E");
    await page.getByLabel("Desarrollo").fill("Desarrollo E2E");
    await page.getByLabel("Conclusion").fill("Conclusion E2E");
    await page.getByLabel("Departamento encargado").selectOption("fisioterapia");
    await page.getByLabel("Buscar por nombre o documento").fill("Rosa");
    await page.getByRole("button", { name: /Rosa/i }).click();
    await page.getByLabel("Agregar fotos de soporte").setInputFiles({
      name: "evidencia.png",
      mimeType: "image/png",
      buffer: onePixelPng,
    });
    await page.getByLabel("Adjuntar documento PDF").setInputFiles({
      name: "soporte.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("pdf"),
    });
    const saveDiligenciamientoResponsePromise = page.waitForResponse(
      (response) =>
        /\/api\/actividades-grupales\/[0-9a-f-]+\/diligenciamiento$/.test(response.url()) &&
        response.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "Guardar diligenciamiento" }).click();

    expect((await saveDiligenciamientoResponsePromise).status()).toBe(200);
    await page.reload();
    await expect(page.getByLabel("Objetivos")).toHaveValue("Objetivos E2E");
    await expect(page.getByLabel("Desarrollo")).toHaveValue("Desarrollo E2E");
    await expect(page.getByLabel("Conclusion")).toHaveValue("Conclusion E2E");

    const activityId = new URL(page.url()).pathname.split("/")[2];
    expect(activityId).toBeTruthy();

    const pdfResponse = await page.request.get(
      `${e2eApiBaseUrl}/actividades-grupales/${activityId}/acta/pdf`,
    );
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
    expect((await pdfResponse.body()).subarray(0, 4).toString()).toBe("%PDF");
  });

  test("permite a un admin crear un lote de alimentación", async ({ page }) => {
    const deliveryDate = new Date().toISOString().slice(0, 10);

    await page.goto("/login");
    await page.getByLabel("Correo").fill(adminCredentials.email);
    await page.getByLabel("Contrasena", { exact: true }).fill(adminCredentials.password);
    await page.getByRole("button", { name: "Iniciar sesion" }).click();

    await expect(page).toHaveURL(/\/home$/);
    await page
      .getByRole("navigation", { name: "Modulos principales" })
      .getByRole("button", { name: "Registro de alimentación", exact: true })
      .click();
    await expect(page).toHaveURL(/\/registro-alimentacion$/);
    await expect(page.getByRole("table")).toBeVisible();

    await page.getByRole("button", { name: "Agregar registro de alimentación" }).click();
    await expect(page).toHaveURL(/\/registro-alimentacion\/new$/);

    await page.getByLabel("Fecha").fill(deliveryDate);
    await page.getByLabel("Organizador").selectOption("nutricionista");
    await page.getByLabel("Buscar por nombre o documento").fill("1020304050");
    await page.getByRole("button", { name: /Rosa Elena Martinez Rojas/i }).click();
    await page.getByLabel("Refrigerio 1 de Rosa Elena Martinez Rojas").selectOption("entregado");
    await page.getByLabel("Almuerzo de Rosa Elena Martinez Rojas").selectOption("entregado");
    await page.getByLabel("Refrigerio 2 de Rosa Elena Martinez Rojas").selectOption("no_aplica");
    await page
      .getByLabel("Auxilio de transporte de Rosa Elena Martinez Rojas")
      .selectOption("entregado");
    await page.getByRole("button", { name: "Guardar alimentación" }).click();

    await expect(page).toHaveURL(/\/registro-alimentacion$/);
    const adultoRowTrigger = page.getByRole("button", {
      name: "Rosa Elena Martinez Rojas",
      exact: true,
    });
    await expect(adultoRowTrigger).toBeVisible();
    await adultoRowTrigger.click();
    await page
      .getByRole("button", {
        name: `Eliminar alimentación de Rosa Elena Martinez Rojas del día ${deliveryDate}`,
      })
      .click();
    await expect(page.getByRole("dialog", { name: "Eliminar alimentación" })).toBeVisible();
    await page.getByRole("button", { name: "Eliminar registro", exact: true }).click();
    await expect(adultoRowTrigger).toBeHidden();
  });
});
