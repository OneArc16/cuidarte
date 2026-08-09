export type EpsCatalogIdentity = {
  code: string;
  nit: string;
  name: string;
  nameNormalized: string;
};

export function assertEpsCatalogIntegrity(
  existingRecords: readonly EpsCatalogIdentity[],
  incomingRecords: readonly EpsCatalogIdentity[],
): void {
  const codeByName = new Map(existingRecords.map((record) => [record.nameNormalized, record.code]));
  const nitByCode = new Map(existingRecords.map((record) => [record.code, record.nit]));

  for (const record of incomingRecords) {
    const existingNit = nitByCode.get(record.code);

    if (existingNit !== undefined && normalizeEpsNit(existingNit) !== normalizeEpsNit(record.nit)) {
      throw new Error(
        `El codigo ${record.code} ya existe con el NIT ${existingNit}; no se reemplazara por ${record.nit}.`,
      );
    }

    const nameOwnerCode = codeByName.get(record.nameNormalized);

    if (nameOwnerCode !== undefined && nameOwnerCode !== record.code) {
      throw new Error(`El nombre ${record.name} ya pertenece al codigo ${nameOwnerCode}.`);
    }
  }
}
import { normalizeEpsNit } from "./eps-reference-data";
