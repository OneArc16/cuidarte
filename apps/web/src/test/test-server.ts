import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const authUserFixture = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
  passwordSetByAdmin: true,
} as const;

export const superAdminUserFixture = {
  ...authUserFixture,
  id: "4c5b84e6-d88e-4f8a-93de-af2916d62f40",
  tenantId: null,
  email: "superadmin@cuidarte.test",
  fullName: "Super Admin CuidarTe",
  role: "super_admin",
} as const;

export const medicoUserFixture = {
  ...authUserFixture,
  email: "medico@centro-demo.test",
  fullName: "Medico Centro Demo",
  role: "medico",
} as const;

export const directorUserFixture = {
  ...authUserFixture,
  email: "director@centro-demo.test",
  fullName: "Director Centro Demo",
  role: "director",
} as const;

export const recreacionistaUserFixture = {
  ...authUserFixture,
  email: "recreacion@centro-demo.test",
  fullName: "Recreacionista Centro Demo",
  role: "recreacionista",
} as const;

export const psicologoUserFixture = {
  ...authUserFixture,
  id: "0d516183-3e18-40ba-90d0-f4e2e978bb9a",
  email: "psicologo@centro-demo.test",
  fullName: "Psicologo Centro Demo",
  role: "psicologo",
} as const;

export const backofficeTenantDetailFixture = {
  tenant: {
    id: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
    documentType: "nit",
    documentNumber: "900123456",
    name: "Centro de Vida Demo",
    email: "contacto@centro-demo.test",
    phone: "6015550101",
    address: "Calle 10 # 20-30",
    city: "Bogota",
    department: "Cundinamarca",
    isActive: true,
    createdAt: "2026-04-21T12:00:00.000Z",
    updatedAt: "2026-04-21T12:00:00.000Z",
  },
  owner: {
    id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
    tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
    email: "admin@centro-demo.test",
    fullName: "Admin Centro Demo",
    isActive: true,
    createdAt: "2026-04-21T12:00:00.000Z",
    updatedAt: "2026-04-21T12:00:00.000Z",
  },
} as const;

export const adultoMayorFixture = {
  id: "0b17e370-8f81-48c0-b707-c7046f497855",
  tenantId: backofficeTenantDetailFixture.tenant.id,
  tenantName: backofficeTenantDetailFixture.tenant.name,
  documentType: "cc",
  documentNumber: "1020304050",
  names: "Rosa Elena",
  surnames: "Martinez Rojas",
  firstName: "Rosa",
  middleName: "Elena",
  firstSurname: "Martinez",
  secondSurname: "Rojas",
  phone: "3105550101",
  phoneSecondary: null,
  email: "rosa.martinez@example.test",
  birthDate: "1948-03-12",
  age: 78,
  sex: "female",
  educationLevel: "Primaria",
  disability: null,
  populationGroup: "Persona mayor",
  address: "Calle 45 # 18-20",
  department: "Cundinamarca",
  municipality: "Bogota",
  zone: "urban",
  country: "Colombia",
  emergencyContactFullName: "Mariana Rojas",
  emergencyContactRelationship: "Hija",
  emergencyContactPhone: "3105552211",
  emergencyContactAddress: "Calle 45 # 18-20",
  bloodType: "o_positive",
  sisben: "B2",
  healthRegime: "subsidized",
  eps: "Salud Demo",
  livesWithSomeone: true,
  companion: "Mariana Rojas",
  economicIncome: 450000,
  socialProgramBeneficiary: true,
  createdAt: "2026-04-21T12:00:00.000Z",
  updatedAt: "2026-04-21T12:00:00.000Z",
} as const;

export const empleadoFixture = {
  id: "aeeb7b27-2c8d-48ce-b2f8-3397d34a6e72",
  tenantId: backofficeTenantDetailFixture.tenant.id,
  tenantName: backofficeTenantDetailFixture.tenant.name,
  documentNumber: "1010101010",
  fullName: "Laura Natalia Perez Ruiz",
  firstName: "Laura",
  middleName: "Natalia",
  firstSurname: "Perez",
  secondSurname: "Ruiz",
  email: "laura.perez@centro-demo.test",
  phone: "3105551212",
  role: "medico",
  isActive: true,
  createdAt: "2026-04-21T12:00:00.000Z",
  updatedAt: "2026-04-21T12:00:00.000Z",
} as const;

export const actividadGrupalFixture = {
  id: "5f0361fb-ff51-43d7-a6e8-83c58df345b6",
  tenantId: backofficeTenantDetailFixture.tenant.id,
  tenantName: backofficeTenantDetailFixture.tenant.name,
  actaNumber: 4,
  activityName: "Jornada psicomotriz",
  activityType: "fisioterapia",
  activityDate: "2026-04-23",
  startTime: "08:30",
  endTime: "10:00",
  organizer: "fisioterapeuta",
  involvedEmployeesCount: 1,
  createdAt: "2026-04-23T12:00:00.000Z",
  updatedAt: "2026-04-23T12:00:00.000Z",
} as const;

export const actividadGrupalFormOptionsFixture = {
  nextActaNumber: 4,
  empleados: [empleadoFixture],
} as const;

export const actividadGrupalIntegranteFixture = {
  id: adultoMayorFixture.id,
  documentNumber: adultoMayorFixture.documentNumber,
  fullName: `${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
} as const;

export const alimentacionAdultoOptionFixture = {
  id: adultoMayorFixture.id,
  tenantId: adultoMayorFixture.tenantId,
  tenantName: adultoMayorFixture.tenantName,
  documentNumber: adultoMayorFixture.documentNumber,
  fullName: `${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
} as const;

export const alimentacionFixture = {
  id: "4f3e6b3b-e94a-4791-9b94-10fdbec70eb3",
  tenantId: backofficeTenantDetailFixture.tenant.id,
  tenantName: backofficeTenantDetailFixture.tenant.name,
  adultoMayorId: adultoMayorFixture.id,
  documentNumber: adultoMayorFixture.documentNumber,
  fullName: `${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
  deliveryDate: "2026-04-24",
  organizer: "nutricionista",
  refrigerio1: "entregado",
  almuerzo: "entregado",
  refrigerio2: "no_aplica",
  auxilioTransporte: "no_entregado",
  createdAt: "2026-04-24T12:00:00.000Z",
  updatedAt: "2026-04-24T12:00:00.000Z",
} as const;

export const atencionIndividualAdultoFixture = {
  id: adultoMayorFixture.id,
  tenantId: adultoMayorFixture.tenantId,
  tenantName: adultoMayorFixture.tenantName,
  documentNumber: adultoMayorFixture.documentNumber,
  fullName: `${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
  age: adultoMayorFixture.age,
  sex: adultoMayorFixture.sex,
  eps: adultoMayorFixture.eps,
  healthRegime: adultoMayorFixture.healthRegime,
} as const;

export const atencionIndividualFixture = {
  id: "2ef00f9e-9a85-47d7-91a4-7030d6f6f951",
  tenantId: adultoMayorFixture.tenantId,
  tenantName: adultoMayorFixture.tenantName,
  adultoMayorId: adultoMayorFixture.id,
  adultoMayor: atencionIndividualAdultoFixture,
  attentionDate: "2026-04-24",
  modalidad: "intramural",
  tipoConsulta: "primera_vez",
  nombreConsulta: "Atencion individual",
  consecutive: 1,
  finalidad: "resolutiva_atencion_general",
  causaExterna: "enfermedad_general",
  motivoConsulta: "Dolor general",
  enfermedadActual: "Paciente refiere dolor general.",
  antecedentesPersonales: null,
  antecedentesFamiliares: null,
  tensionSistolica: 120,
  tensionDiastolica: 80,
  frecuenciaCardiaca: null,
  frecuenciaRespiratoria: null,
  temperatura: null,
  saturacionOxigeno: null,
  pesoKg: null,
  tallaCm: null,
  imc: null,
  perimetroAbdominalCm: null,
  examenFisico: null,
  resultadosLaboratorios: null,
  resultadosProcedimientos: null,
  ordenesMedicas: [],
  diagnosticos: [
    {
      id: "diagnostico-1",
      codigoCie10: "I10",
      descripcion: "Hipertension esencial",
      tipo: "principal",
    },
  ],
  supportFiles: [],
  createdByUserId: authUserFixture.id,
  updatedByUserId: authUserFixture.id,
  createdAt: "2026-04-24T12:00:00.000Z",
  updatedAt: "2026-04-24T12:00:00.000Z",
} as const;

export const otherProfessionalAtencionIndividualFixture = {
  ...atencionIndividualFixture,
  id: "3f8c63f0-8915-42ee-96c8-0af15b2f26a6",
  consecutive: 2,
  nombreConsulta: "Control de psicologia",
  createdByUserId: psicologoUserFixture.id,
  updatedByUserId: psicologoUserFixture.id,
} as const;

export const historiaClinicaFixture = {
  adultoMayor: atencionIndividualAdultoFixture,
  atenciones: [
    {
      id: atencionIndividualFixture.id,
      adultoMayorId: atencionIndividualFixture.adultoMayorId,
      attentionDate: atencionIndividualFixture.attentionDate,
      modalidad: atencionIndividualFixture.modalidad,
      tipoConsulta: atencionIndividualFixture.tipoConsulta,
      nombreConsulta: atencionIndividualFixture.nombreConsulta,
      consecutive: atencionIndividualFixture.consecutive,
      createdAt: atencionIndividualFixture.createdAt,
      updatedAt: atencionIndividualFixture.updatedAt,
      professional: {
        userId: atencionIndividualFixture.createdByUserId,
        fullName: medicoUserFixture.fullName,
        role: medicoUserFixture.role,
      },
      access: "edit",
    },
    {
      id: otherProfessionalAtencionIndividualFixture.id,
      adultoMayorId: otherProfessionalAtencionIndividualFixture.adultoMayorId,
      attentionDate: otherProfessionalAtencionIndividualFixture.attentionDate,
      modalidad: otherProfessionalAtencionIndividualFixture.modalidad,
      tipoConsulta: otherProfessionalAtencionIndividualFixture.tipoConsulta,
      nombreConsulta: otherProfessionalAtencionIndividualFixture.nombreConsulta,
      consecutive: otherProfessionalAtencionIndividualFixture.consecutive,
      createdAt: otherProfessionalAtencionIndividualFixture.createdAt,
      updatedAt: otherProfessionalAtencionIndividualFixture.updatedAt,
      professional: {
        userId: otherProfessionalAtencionIndividualFixture.createdByUserId,
        fullName: psicologoUserFixture.fullName,
        role: psicologoUserFixture.role,
      },
      access: "view",
    },
  ],
} as const;

export const cie10OptionsFixture = [
  {
    code: "G560",
    title: "SINDROME DEL TUNEL CARPIANO",
  },
  {
    code: "G561",
    title: "OTRAS LESIONES DEL NERVIO MEDIANO",
  },
  {
    code: "G562",
    title: "LESION DEL NERVIO CUBITAL",
  },
] as const;

export const actividadGrupalDiligenciamientoFixture = {
  ...actividadGrupalFixture,
  assignedProfessionals: [
    {
      id: empleadoFixture.id,
      fullName: empleadoFixture.fullName,
      role: empleadoFixture.role,
    },
  ],
  objectives: "",
  development: "",
  conclusion: "",
  responsibleDepartment: null,
  integrantes: [],
  photoFiles: [
    {
      id: "ecf23fbc-0127-45a5-bf39-f31e14902123",
      kind: "support_photo",
      originalName: "foto-soporte.webp",
      mimeType: "image/webp",
      sizeBytes: 245760,
      createdAt: "2026-04-23T12:00:00.000Z",
    },
  ],
  pdfFile: {
    id: "514cd20a-d079-4028-a5ab-6cec0aa0abf2",
    kind: "support_pdf",
    originalName: "soporte.pdf",
    mimeType: "application/pdf",
    sizeBytes: 92500,
    createdAt: "2026-04-23T12:00:00.000Z",
  },
  diligenciamientoCreatedAt: null,
  diligenciamientoUpdatedAt: null,
} as const;

export const server = setupServer(
  http.get("http://localhost:3001/api/health", () =>
    HttpResponse.json({
      service: "cuidarte-api",
      status: "ok",
      timestamp: "2026-04-21T12:00:00.000Z",
    }),
  ),
  http.get("http://localhost:3001/api/auth/me", () => HttpResponse.json({ user: null })),
  http.post("http://localhost:3001/api/auth/login", () =>
    HttpResponse.json({ user: authUserFixture }),
  ),
  http.post("http://localhost:3001/api/auth/logout", () => HttpResponse.json({ success: true })),
  http.get("http://localhost:3001/api/backoffice/tenants", () =>
    HttpResponse.json({ tenants: [backofficeTenantDetailFixture] }),
  ),
  http.get("http://localhost:3001/api/backoffice/tenants/:tenantId", () =>
    HttpResponse.json(backofficeTenantDetailFixture),
  ),
  http.post("http://localhost:3001/api/backoffice/tenants", () =>
    HttpResponse.json(backofficeTenantDetailFixture),
  ),
  http.patch("http://localhost:3001/api/backoffice/tenants/:tenantId", () =>
    HttpResponse.json(backofficeTenantDetailFixture),
  ),
  http.get("http://localhost:3001/api/adultos-mayores", () =>
    HttpResponse.json({ adultosMayores: [adultoMayorFixture] }),
  ),
  http.get("http://localhost:3001/api/adultos-mayores/tenant-options", () =>
    HttpResponse.json({ tenants: [backofficeTenantDetailFixture.tenant] }),
  ),
  http.get("http://localhost:3001/api/adultos-mayores/:adultoMayorId", () =>
    HttpResponse.json(adultoMayorFixture),
  ),
  http.post("http://localhost:3001/api/adultos-mayores", () =>
    HttpResponse.json(adultoMayorFixture),
  ),
  http.patch("http://localhost:3001/api/adultos-mayores/:adultoMayorId", () =>
    HttpResponse.json(adultoMayorFixture),
  ),
  http.get(
    "http://localhost:3001/api/atenciones-individuales/adultos-mayores/:adultoMayorId/lookup",
    () =>
      HttpResponse.json({
        adultoMayor: atencionIndividualAdultoFixture,
        suggestedConsecutive: 1,
      }),
  ),
  http.get(
    "http://localhost:3001/api/atenciones-individuales/adultos-mayores/:adultoMayorId/history",
    () => HttpResponse.json(historiaClinicaFixture),
  ),
  http.post("http://localhost:3001/api/atenciones-individuales", async ({ request }) => {
    const payload = await readAtencionIndividualPayload(request);

    return HttpResponse.json({
      ...atencionIndividualFixture,
      ...payload,
      id: atencionIndividualFixture.id,
      adultoMayor: atencionIndividualAdultoFixture,
      tenantId: adultoMayorFixture.tenantId,
      tenantName: adultoMayorFixture.tenantName,
      createdByUserId: authUserFixture.id,
      updatedByUserId: authUserFixture.id,
      createdAt: atencionIndividualFixture.createdAt,
      updatedAt: "2026-04-24T12:10:00.000Z",
    });
  }),
  http.get("http://localhost:3001/api/atenciones-individuales/:atencionId", () =>
    HttpResponse.json(atencionIndividualFixture),
  ),
  http.patch(
    "http://localhost:3001/api/atenciones-individuales/:atencionId",
    async ({ request }) => {
      const payload = await readAtencionIndividualPayload(request);

      return HttpResponse.json({
        ...atencionIndividualFixture,
        ...payload,
        updatedAt: "2026-04-24T12:20:00.000Z",
      });
    },
  ),
  http.get("http://localhost:3001/api/cie10/options", ({ request }) => {
    const search = new URL(request.url).searchParams.get("search")?.trim().toLowerCase() ?? "";
    const options =
      search.length < 3
        ? []
        : cie10OptionsFixture.filter((option) =>
            [option.code, option.title].join(" ").toLowerCase().includes(search),
          );

    return HttpResponse.json({ options });
  }),
  http.get("http://localhost:3001/api/empleados", () =>
    HttpResponse.json({ empleados: [empleadoFixture] }),
  ),
  http.get("http://localhost:3001/api/empleados/tenant-options", () =>
    HttpResponse.json({ tenants: [backofficeTenantDetailFixture.tenant] }),
  ),
  http.get("http://localhost:3001/api/empleados/:empleadoId", () =>
    HttpResponse.json(empleadoFixture),
  ),
  http.post("http://localhost:3001/api/empleados", () => HttpResponse.json(empleadoFixture)),
  http.patch("http://localhost:3001/api/empleados/:empleadoId", () =>
    HttpResponse.json(empleadoFixture),
  ),
  http.get("http://localhost:3001/api/actividades-grupales", ({ request }) => {
    const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? null;
    const activityType = new URL(request.url).searchParams.get("activityType");
    const actividades = [actividadGrupalFixture].filter((actividad) => {
      const matchesSearch =
        search === null ||
        [
          String(actividad.actaNumber),
          actividad.activityName,
          actividad.activityType,
          actividad.organizer,
        ].some((value) => value.toLowerCase().includes(search));
      const matchesActivityType =
        activityType === null || activityType === "" || actividad.activityType === activityType;

      return matchesSearch && matchesActivityType;
    });

    return HttpResponse.json({ actividadesGrupales: actividades });
  }),
  http.get("http://localhost:3001/api/actividades-grupales/tenant-options", () =>
    HttpResponse.json({ tenants: [backofficeTenantDetailFixture.tenant] }),
  ),
  http.get("http://localhost:3001/api/actividades-grupales/form-options", () =>
    HttpResponse.json(actividadGrupalFormOptionsFixture),
  ),
  http.post("http://localhost:3001/api/actividades-grupales", () =>
    HttpResponse.json(actividadGrupalFixture),
  ),
  http.get("http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento", () =>
    HttpResponse.json(actividadGrupalDiligenciamientoFixture),
  ),
  http.get(
    "http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento/integrantes-options",
    ({ request }) => {
      const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? "";
      const integrantes = [actividadGrupalIntegranteFixture].filter((integrante) =>
        [integrante.documentNumber, integrante.fullName].join(" ").toLowerCase().includes(search),
      );

      return HttpResponse.json({ integrantes });
    },
  ),
  http.put(
    "http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento",
    async ({ request }) => {
      const formData = await request.formData();
      const payload = JSON.parse(String(formData.get("payload") ?? "{}")) as Record<
        string,
        unknown
      >;
      const photoFiles = formData.getAll("photos");
      const pdfFile = formData.get("pdf");

      return HttpResponse.json({
        ...actividadGrupalDiligenciamientoFixture,
        objectives: payload.objectives ?? "",
        development: payload.development ?? "",
        conclusion: payload.conclusion ?? "",
        responsibleDepartment: payload.responsibleDepartment ?? null,
        integrantes:
          Array.isArray(payload.integranteIds) &&
          payload.integranteIds.includes(adultoMayorFixture.id)
            ? [actividadGrupalIntegranteFixture]
            : [],
        photoFiles:
          photoFiles.length === 0
            ? actividadGrupalDiligenciamientoFixture.photoFiles
            : photoFiles.map((file, index) => ({
                id: `123e4567-e89b-42d3-a456-4266141740${String(index + 1).padStart(2, "0")}`,
                kind: "support_photo",
                originalName: file instanceof File ? file.name : `foto-${index + 1}.jpg`,
                mimeType: file instanceof File ? file.type : "image/jpeg",
                sizeBytes: file instanceof File ? file.size : 1024,
                createdAt: "2026-04-24T12:00:00.000Z",
              })),
        pdfFile:
          pdfFile instanceof File
            ? {
                id: "223e4567-e89b-42d3-a456-426614174099",
                kind: "support_pdf",
                originalName: pdfFile.name,
                mimeType: pdfFile.type,
                sizeBytes: pdfFile.size,
                createdAt: "2026-04-24T12:00:00.000Z",
              }
            : actividadGrupalDiligenciamientoFixture.pdfFile,
        diligenciamientoCreatedAt: "2026-04-24T12:00:00.000Z",
        diligenciamientoUpdatedAt: "2026-04-24T12:00:00.000Z",
      });
    },
  ),
  http.get(
    "http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento/files/:fileId",
    ({ params }) => {
      const isPdf = String(params.fileId).includes("pdf");

      return new HttpResponse(isPdf ? "pdf" : "image", {
        headers: {
          "Content-Type": isPdf ? "application/pdf" : "image/webp",
        },
      });
    },
  ),
  http.get("http://localhost:3001/api/registro-alimentacion", ({ request }) => {
    const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? null;
    const deliveryDate = new URL(request.url).searchParams.get("deliveryDate");
    const registros = [alimentacionFixture].filter((registro) => {
      const matchesSearch =
        search === null ||
        [registro.documentNumber, registro.fullName, registro.organizer]
          .join(" ")
          .toLowerCase()
          .includes(search);
      const matchesDate =
        deliveryDate === null || deliveryDate === "" || registro.deliveryDate === deliveryDate;

      return matchesSearch && matchesDate;
    });

    return HttpResponse.json({ registros });
  }),
  http.get("http://localhost:3001/api/registro-alimentacion/tenant-options", () =>
    HttpResponse.json({ tenants: [backofficeTenantDetailFixture.tenant] }),
  ),
  http.get(
    "http://localhost:3001/api/registro-alimentacion/adultos-mayores-options",
    ({ request }) => {
      const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? "";

      const adultosMayores = [alimentacionAdultoOptionFixture].filter((adultoMayor) =>
        [adultoMayor.documentNumber, adultoMayor.fullName].join(" ").toLowerCase().includes(search),
      );

      return HttpResponse.json({ adultosMayores });
    },
  ),
  http.get(
    "http://localhost:3001/api/registro-alimentacion/adultos-mayores/:adultoMayorId/lookup",
    () =>
      HttpResponse.json({
        adultoMayor: alimentacionAdultoOptionFixture,
        existingRecordId: null,
      }),
  ),
  http.post("http://localhost:3001/api/registro-alimentacion", async ({ request }) => {
    const payload = (await request.json()) as { registros?: unknown[] };

    return HttpResponse.json({
      createdCount: Array.isArray(payload.registros) ? payload.registros.length : 1,
    });
  }),
  http.get("http://localhost:3001/api/registro-alimentacion/:recordId", () =>
    HttpResponse.json(alimentacionFixture),
  ),
  http.patch("http://localhost:3001/api/registro-alimentacion/:recordId", async ({ request }) => {
    const payload = (await request.json()) as Record<string, unknown>;

    return HttpResponse.json({
      ...alimentacionFixture,
      deliveryDate: payload.deliveryDate ?? alimentacionFixture.deliveryDate,
      organizer: payload.organizer ?? alimentacionFixture.organizer,
      refrigerio1: payload.refrigerio1 ?? alimentacionFixture.refrigerio1,
      almuerzo: payload.almuerzo ?? alimentacionFixture.almuerzo,
      refrigerio2: payload.refrigerio2 ?? alimentacionFixture.refrigerio2,
      auxilioTransporte: payload.auxilioTransporte ?? alimentacionFixture.auxilioTransporte,
      updatedAt: "2026-04-25T12:00:00.000Z",
    });
  }),
  http.get(
    "http://localhost:3001/api/adultos-mayores/export/excel",
    () =>
      new HttpResponse("excel", {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      }),
  ),
  http.get(
    "http://localhost:3001/api/adultos-mayores/export/pdf",
    () =>
      new HttpResponse("pdf", {
        headers: {
          "Content-Type": "application/pdf",
        },
      }),
  ),
);

async function readAtencionIndividualPayload(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return (await request.json()) as Record<string, unknown>;
  }

  const formData = await request.formData();
  const rawPayload = formData.get("payload");

  if (typeof rawPayload !== "string") {
    return {};
  }

  const parsedPayload = JSON.parse(rawPayload) as Record<string, unknown>;

  if (
    "payload" in parsedPayload &&
    typeof parsedPayload.payload === "object" &&
    parsedPayload.payload !== null
  ) {
    return parsedPayload.payload as Record<string, unknown>;
  }

  return parsedPayload;
}
