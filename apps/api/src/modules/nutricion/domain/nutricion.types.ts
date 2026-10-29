import {
  type NutricionFollowUpAdherence,
  type NutricionMealSlot,
  type NutricionPlanStatus,
  type AdultoMayorDocumentType,
  type UserRole,
} from "@cuidarte/contracts";

export type NutricionScope = { type: "all" } | { type: "tenant"; tenantId: string };

export type NutricionAdultoRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  documentType: AdultoMayorDocumentType;
  documentNumber: string;
  fullName: string;
  phone: string | null;
  birthDate: string;
  sex: string;
  eps: string | null;
  healthRegime: string | null;
  status: "alive" | "deceased";
  deathDate: string | null;
};

export type NutricionProfessionalRecord = {
  userId: string;
  fullName: string;
  role: UserRole;
};

export type NutricionPlanMealRecord = {
  id: string;
  slot: NutricionMealSlot;
  instruction: string;
  portion: string | null;
  frequency: string | null;
  sortOrder: number;
};

export type NutricionPlanRecord = {
  id: string;
  tenantId: string;
  adultoMayorId: string;
  adultoMayor: NutricionAdultoRecord;
  startDate: string;
  nextFollowUpDate: string | null;
  status: NutricionPlanStatus;
  assessment: string;
  goal: string;
  recommendations: string;
  restrictions: string | null;
  professional: NutricionProfessionalRecord;
  createdByUserId: string;
  updatedByUserId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  meals: NutricionPlanMealRecord[];
};

export type NutricionFollowUpRecord = {
  id: string;
  tenantId: string;
  planId: string;
  followUpDate: string;
  weightKg: number | null;
  heightCm: number | null;
  bodyMassIndex: number | null;
  abdominalPerimeterCm: number | null;
  adherence: NutricionFollowUpAdherence;
  progressNote: string;
  adjustments: string | null;
  nextFollowUpDate: string | null;
  professional: NutricionProfessionalRecord;
  createdByUserId: string;
  updatedByUserId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NutricionPlanListRecord = Omit<NutricionPlanRecord, "meals">;

export type NutricionPlanMealCommand = Omit<NutricionPlanMealRecord, "id" | "sortOrder">;

export type NutricionPlanMutableCommand = {
  startDate: string;
  nextFollowUpDate: string | null;
  status: Extract<NutricionPlanStatus, "active" | "completed">;
  assessment: string;
  goal: string;
  recommendations: string;
  restrictions: string | null;
  meals: NutricionPlanMealCommand[];
};

export type CreateNutricionPlanRecordCommand = NutricionPlanMutableCommand & {
  adultoMayorId: string;
  tenantId: string;
  actorUserId: string;
};

export type UpdateNutricionPlanRecordCommand = NutricionPlanMutableCommand & {
  id: string;
  tenantId: string;
  actorUserId: string;
  version: number;
};

export type NutricionFollowUpMutableCommand = {
  followUpDate: string;
  weightKg: number | null;
  heightCm: number | null;
  bodyMassIndex: number | null;
  abdominalPerimeterCm: number | null;
  adherence: NutricionFollowUpAdherence;
  progressNote: string;
  adjustments: string | null;
  nextFollowUpDate: string | null;
};

export type CreateNutricionFollowUpRecordCommand = NutricionFollowUpMutableCommand & {
  planId: string;
  tenantId: string;
  actorUserId: string;
};

export type UpdateNutricionFollowUpRecordCommand = NutricionFollowUpMutableCommand & {
  id: string;
  tenantId: string;
  actorUserId: string;
  version: number;
};
