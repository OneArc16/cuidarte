import {
  type CreateNutricionFollowUpRecordCommand,
  type CreateNutricionPlanRecordCommand,
  type NutricionAdultoRecord,
  type NutricionFollowUpRecord,
  type NutricionPlanListRecord,
  type NutricionPlanRecord,
  type NutricionScope,
  type UpdateNutricionFollowUpRecordCommand,
  type UpdateNutricionPlanRecordCommand,
} from "./nutricion.types";

export const NUTRICION_REPOSITORY = Symbol("NUTRICION_REPOSITORY");

export type NutricionRepository = {
  findAdultoMayorById(query: {
    adultoMayorId: string;
    scope: NutricionScope;
  }): Promise<NutricionAdultoRecord | null>;
  findAdultosMayores(query: {
    scope: NutricionScope;
    search: string | null;
    page: number;
    pageSize: number;
  }): Promise<{ adultosMayores: NutricionAdultoRecord[]; total: number }>;
  findPlansByAdultoMayor(query: {
    adultoMayorId: string;
    scope: NutricionScope;
  }): Promise<NutricionPlanListRecord[]>;
  findPlanById(query: { id: string; scope: NutricionScope }): Promise<NutricionPlanRecord | null>;
  findFollowUpsByPlanId(query: {
    planId: string;
    scope: NutricionScope;
  }): Promise<NutricionFollowUpRecord[]>;
  findFollowUpById(query: {
    id: string;
    scope: NutricionScope;
  }): Promise<NutricionFollowUpRecord | null>;
  createPlan(command: CreateNutricionPlanRecordCommand): Promise<{ id: string }>;
  updatePlan(command: UpdateNutricionPlanRecordCommand): Promise<boolean>;
  createFollowUp(command: CreateNutricionFollowUpRecordCommand): Promise<{ id: string }>;
  updateFollowUp(command: UpdateNutricionFollowUpRecordCommand): Promise<boolean>;
};
