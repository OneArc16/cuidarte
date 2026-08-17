import {
  type AtencionEnfermeriaCareType,
  type AtencionEnfermeriaGlucometriaContext,
  type AtencionEnfermeriaHistoryAccess,
  type AtencionEnfermeriaProfessional,
} from "@cuidarte/contracts";
import type { UserRole } from "@cuidarte/contracts";

export type AtencionEnfermeriaScope =
  | {
      type: "all";
    }
  | {
      type: "tenant";
      tenantId: string;
    };

export type AtencionEnfermeriaAdultoRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  documentNumber: string;
  fullName: string;
  birthDate: string;
  sex: string;
  eps: string | null;
  healthRegime: string | null;
};

export type AtencionEnfermeriaRecordBase = {
  id: string;
  tenantId: string;
  tenantName: string;
  adultoMayorId: string;
  adultoMayor: AtencionEnfermeriaAdultoRecord;
  attentionDate: string;
  attentionTime: string;
  careType: AtencionEnfermeriaCareType;
  reason: string | null;
  tensionSistolica: number | null;
  tensionDiastolica: number | null;
  frecuenciaCardiaca: number | null;
  frecuenciaRespiratoria: number | null;
  temperatura: number | null;
  saturacionOxigeno: number | null;
  pesoKg: number | null;
  tallaCm: number | null;
  imc: number | null;
  perimetroAbdominalCm: number | null;
  glucometriaMgDl: number | null;
  glucometriaContext: AtencionEnfermeriaGlucometriaContext | null;
  professional: AtencionEnfermeriaProfessional;
  createdByUserId: string;
  updatedByUserId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AtencionEnfermeriaListItemRecord = AtencionEnfermeriaRecordBase;

export type AtencionEnfermeriaHistoryItemRecord = AtencionEnfermeriaRecordBase;

export type AtencionEnfermeriaDetailRecord = AtencionEnfermeriaRecordBase & {
  nursingNote: string;
};

export type FindAtencionEnfermeriaByIdQuery = {
  id: string;
  scope: AtencionEnfermeriaScope;
};

export type FindAtencionEnfermeriaListQuery = {
  scope: AtencionEnfermeriaScope;
  search?: string | null;
  tenantId?: string | null;
  adultoMayorId?: string | null;
  documentNumber?: string | null;
  professionalUserId?: string | null;
  attentionDate?: string | null;
  limit?: number;
  offset?: number;
};

export type FindAtencionEnfermeriaHistoryByAdultoMayorQuery = {
  adultoMayorId: string;
  scope: AtencionEnfermeriaScope;
  createdByUserId?: string | null;
};

export type AtencionEnfermeriaMutableCommand = {
  attentionDate: string;
  attentionTime: string;
  careType: AtencionEnfermeriaCareType;
  reason: string | null;
  tensionSistolica: number | null;
  tensionDiastolica: number | null;
  frecuenciaCardiaca: number | null;
  frecuenciaRespiratoria: number | null;
  temperatura: number | null;
  saturacionOxigeno: number | null;
  pesoKg: number | null;
  tallaCm: number | null;
  perimetroAbdominalCm: number | null;
  glucometriaMgDl: number | null;
  glucometriaContext: AtencionEnfermeriaGlucometriaContext | null;
  nursingNote: string;
};

export type CreateAtencionEnfermeriaRecordCommand = AtencionEnfermeriaMutableCommand & {
  id: string;
  tenantId: string;
  adultoMayorId: string;
  actorUserId: string;
};

export type UpdateAtencionEnfermeriaRecordCommand = AtencionEnfermeriaMutableCommand & {
  id: string;
  tenantId: string;
  actorUserId: string;
  version: number;
};

export type AtencionEnfermeriaAuditMetadata = Record<string, unknown>;

export type AtencionEnfermeriaAccess = AtencionEnfermeriaHistoryAccess;

