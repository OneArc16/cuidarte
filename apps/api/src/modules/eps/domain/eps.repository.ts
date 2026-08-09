import { type EpsRecord } from "./eps.types";

export const EPS_REPOSITORY = Symbol("EPS_REPOSITORY");

export type EpsRepository = {
  findActive(): Promise<EpsRecord[]>;
  findById(id: string): Promise<EpsRecord | null>;
};
