import { adultoMayorFixture } from "./adultos-mayores.fixtures";
import { authUserFixture, medicoUserFixture, psicologoUserFixture } from "./auth.fixtures";

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
