import { adultoMayorFixture } from "./adultos-mayores.fixtures";
import { backofficeTenantDetailFixture } from "./backoffice.fixtures";
import { empleadoFixture } from "./empleados.fixtures";

export const actividadGrupalFixture = {
  id: "5f0361fb-ff51-43d7-a6e8-83c58df345b6",
  tenantId: backofficeTenantDetailFixture.tenant.id,
  tenantName: backofficeTenantDetailFixture.tenant.name,
  actaNumber: "0004",
  activityName: "Jornada psicomotriz",
  activityType: "fisioterapia",
  activityDate: "2026-04-23",
  startTime: "08:30",
  endTime: "10:00",
  organizer: "fisioterapeuta",
  involvedEmployeesCount: 1,
  canEdit: true,
  canDelete: true,
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
