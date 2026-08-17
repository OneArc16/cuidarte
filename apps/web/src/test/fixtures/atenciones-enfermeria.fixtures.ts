import { adultoMayorFixture } from "./adultos-mayores.fixtures";
import { enfermeriaApoyoUserFixture, enfermeriaUserFixture } from "./auth.fixtures";

export const atencionEnfermeriaAdultoFixture = {
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

export const atencionEnfermeriaFixture = {
  id: "4c1c58ca-67d0-4f5e-9c30-6c28fcb5c8d1",
  tenantId: adultoMayorFixture.tenantId,
  tenantName: adultoMayorFixture.tenantName,
  adultoMayorId: adultoMayorFixture.id,
  adultoMayor: atencionEnfermeriaAdultoFixture,
  attentionDate: "2026-08-16",
  attentionTime: "08:30",
  careType: "control_signos_vitales",
  reason: "Control habitual",
  tensionSistolica: 120,
  tensionDiastolica: 80,
  frecuenciaCardiaca: 72,
  frecuenciaRespiratoria: 18,
  temperatura: 36.4,
  saturacionOxigeno: 97,
  pesoKg: 62.3,
  tallaCm: 165,
  imc: 22.9,
  perimetroAbdominalCm: 88.5,
  glucometriaMgDl: 95,
  glucometriaContext: "ayunas",
  nursingNote: "Sin novedades durante la valoración.",
  professional: {
    userId: enfermeriaUserFixture.id,
    fullName: enfermeriaUserFixture.fullName,
    role: enfermeriaUserFixture.role,
  },
  access: "edit",
  createdByUserId: enfermeriaUserFixture.id,
  updatedByUserId: enfermeriaUserFixture.id,
  version: 1,
  createdAt: "2026-08-16T13:00:00.000Z",
  updatedAt: "2026-08-16T13:00:00.000Z",
} as const;

export const atencionEnfermeriaOtherFixture = {
  ...atencionEnfermeriaFixture,
  id: "cd29b5f8-2a9f-4c7d-8df2-2460c7c927c5",
  careType: "seguimiento",
  access: "view",
  professional: {
    userId: enfermeriaApoyoUserFixture.id,
    fullName: enfermeriaApoyoUserFixture.fullName,
    role: enfermeriaApoyoUserFixture.role,
  },
  nursingNote: "Valoración y registro de signos vitales.",
  createdByUserId: enfermeriaApoyoUserFixture.id,
  updatedByUserId: enfermeriaApoyoUserFixture.id,
  attentionTime: "09:10",
  createdAt: "2026-08-16T14:00:00.000Z",
  updatedAt: "2026-08-16T14:00:00.000Z",
} as const;

export const atencionEnfermeriaHistoryFixture = {
  adultoMayor: atencionEnfermeriaAdultoFixture,
  atenciones: [atencionEnfermeriaFixture, atencionEnfermeriaOtherFixture].map(
    ({ nursingNote: _nursingNote, ...record }) => record,
  ),
} as const;

export const atencionesEnfermeriaFixture = {
  atencionesEnfermeria: [atencionEnfermeriaFixture, atencionEnfermeriaOtherFixture],
} as const;
