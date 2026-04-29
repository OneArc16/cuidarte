import { type Cie10OptionRecord, type Cie10SearchOptionsQuery } from "./cie10.types";

export const CIE10_REPOSITORY = Symbol("CIE10_REPOSITORY");

export type Cie10Repository = {
  searchOptions(query: Cie10SearchOptionsQuery): Promise<Cie10OptionRecord[]>;
};
