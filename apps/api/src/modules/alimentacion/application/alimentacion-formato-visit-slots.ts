import { type AlimentacionFormatoEntregaExportRecord } from "./alimentacion-formato-export.types";

export const FORMATO_ENTREGA_VISITS_PER_BLOCK = 12;
export const FORMATO_ENTREGA_TOTAL_VISITS =
  FORMATO_ENTREGA_VISITS_PER_BLOCK * 2;

type DeliverableStatus =
  AlimentacionFormatoEntregaExportRecord["refrigerio1"];

export type AlimentacionFormatoEntregaVisitSlot = {
  visitNumber: number;
  columnLabel: number;
  deliveryDate: string | null;
  refrigerio1Mark: "" | "X";
  almuerzoMark: "" | "X";
  refrigerio2Mark: "" | "X";
  auxilioTransporteMark: "" | "X";
};

export type AlimentacionFormatoEntregaVisitBlock = {
  blockIndex: number;
  slots: AlimentacionFormatoEntregaVisitSlot[];
};

export function buildFormatoEntregaVisitBlocks(
  records: AlimentacionFormatoEntregaExportRecord[],
): AlimentacionFormatoEntregaVisitBlock[] {
  const sortedRecords = records
    .slice()
    .sort((left, right) => left.deliveryDate.localeCompare(right.deliveryDate))
    .slice(0, FORMATO_ENTREGA_TOTAL_VISITS);

  return Array.from({ length: 2 }, (_, blockIndex) => ({
    blockIndex,
    slots: Array.from({ length: FORMATO_ENTREGA_VISITS_PER_BLOCK }, (_, slotIndex) => {
      const visitNumber = blockIndex * FORMATO_ENTREGA_VISITS_PER_BLOCK + slotIndex + 1;
      const record = sortedRecords[visitNumber - 1] ?? null;

      return {
        visitNumber,
        columnLabel: slotIndex + 1,
        deliveryDate: record?.deliveryDate ?? null,
        refrigerio1Mark: toCellMark(record?.refrigerio1),
        almuerzoMark: toCellMark(record?.almuerzo),
        refrigerio2Mark: toCellMark(record?.refrigerio2),
        auxilioTransporteMark: toCellMark(record?.auxilioTransporte),
      };
    }),
  }));
}

function toCellMark(status: DeliverableStatus | undefined): "" | "X" {
  return status === "entregado" ? "X" : "";
}
