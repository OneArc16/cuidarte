import { type CreateEquipoCommand, type EquipoRecord, type UpdateEquipoCommand } from "./equipo.types";

export const EQUIPOS_REPOSITORY = Symbol("EQUIPOS_REPOSITORY");

export type EquiposRepository = {
  findMany(): Promise<EquipoRecord[]>;
  findById(id: string): Promise<EquipoRecord | null>;
  findByNormalizedName(normalizedName: string): Promise<EquipoRecord | null>;
  create(command: CreateEquipoCommand): Promise<EquipoRecord>;
  update(command: UpdateEquipoCommand): Promise<EquipoRecord>;
};
