import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildFormatoEntregaVisitBlocks,
  FORMATO_ENTREGA_TOTAL_VISITS,
  FORMATO_ENTREGA_VISITS_PER_BLOCK,
} from "./alimentacion-formato-visit-slots";
import { type AlimentacionFormatoEntregaExportRecord } from "./alimentacion-formato-export.types";

describe("alimentacion-formato-visit-slots", () => {
  it("builds 24 empty slots when there are no visits", () => {
    const blocks = buildFormatoEntregaVisitBlocks([]);

    assert.equal(blocks.length, 2);
    assert.equal(blocks[0]?.slots.length, FORMATO_ENTREGA_VISITS_PER_BLOCK);
    assert.equal(blocks[1]?.slots.length, FORMATO_ENTREGA_VISITS_PER_BLOCK);
    assert.equal(
      blocks.flatMap((block) => block.slots).filter((slot) => slot.deliveryDate !== null).length,
      0,
    );
  });

  it("maps a single visit to the first slot", () => {
    const [firstBlock] = buildFormatoEntregaVisitBlocks([record("2026-08-01", "entregado")]);

    assert.equal(firstBlock?.slots[0]?.visitNumber, 1);
    assert.equal(firstBlock?.slots[0]?.deliveryDate, "2026-08-01");
    assert.equal(firstBlock?.slots[0]?.refrigerio1Mark, "X");
    assert.equal(firstBlock?.slots[1]?.deliveryDate, null);
  });

  it("fills visits sequentially regardless of calendar gaps", () => {
    const [firstBlock] = buildFormatoEntregaVisitBlocks([
      record("2026-08-01", "entregado"),
      record("2026-08-10", "entregado"),
      record("2026-08-31", "entregado"),
    ]);

    assert.deepEqual(
      firstBlock?.slots.slice(0, 3).map((slot) => slot.deliveryDate),
      ["2026-08-01", "2026-08-10", "2026-08-31"],
    );
    assert.equal(firstBlock?.slots[3]?.deliveryDate, null);
  });

  it("fills the first five visit slots and leaves the rest empty", () => {
    const [firstBlock] = buildFormatoEntregaVisitBlocks(
      Array.from({ length: 5 }, (_, index) => record(`2026-08-0${index + 1}`, "entregado")),
    );

    assert.equal(
      firstBlock?.slots.filter((slot) => slot.deliveryDate !== null).length,
      5,
    );
    assert.equal(firstBlock?.slots[5]?.deliveryDate, null);
  });

  it("uses all 24 slots when there are exactly 24 visits", () => {
    const blocks = buildFormatoEntregaVisitBlocks(
      Array.from({ length: FORMATO_ENTREGA_TOTAL_VISITS }, (_, index) =>
        record(`2026-08-${String(index + 1).padStart(2, "0")}`, "entregado"),
      ),
    );

    const slots = blocks.flatMap((block) => block.slots);

    assert.equal(slots.filter((slot) => slot.deliveryDate !== null).length, 24);
    assert.equal(slots[23]?.visitNumber, 24);
    assert.equal(slots[23]?.columnLabel, 12);
  });

  it("truncates visits beyond slot 24", () => {
    const blocks = buildFormatoEntregaVisitBlocks(
      Array.from({ length: 30 }, (_, index) =>
        record(`2026-08-${String((index % 28) + 1).padStart(2, "0")}`, "entregado"),
      ),
    );

    const slots = blocks.flatMap((block) => block.slots);

    assert.equal(slots.length, 24);
    assert.equal(slots.filter((slot) => slot.deliveryDate !== null).length, 24);
    assert.equal(slots.at(-1)?.visitNumber, 24);
  });

  it("marks only delivered products with X", () => {
    const [firstBlock] = buildFormatoEntregaVisitBlocks([
      {
        deliveryDate: "2026-08-01",
        organizer: "director",
        refrigerio1: "entregado",
        almuerzo: "no_entregado",
        refrigerio2: "no_aplica",
        auxilioTransporte: "entregado",
        updatedAt: new Date("2026-08-01T12:00:00.000Z"),
      },
    ]);

    assert.equal(firstBlock?.slots[0]?.refrigerio1Mark, "X");
    assert.equal(firstBlock?.slots[0]?.almuerzoMark, "");
    assert.equal(firstBlock?.slots[0]?.refrigerio2Mark, "");
    assert.equal(firstBlock?.slots[0]?.auxilioTransporteMark, "X");
  });
});

function record(
  deliveryDate: string,
  deliveredStatus: AlimentacionFormatoEntregaExportRecord["refrigerio1"],
): AlimentacionFormatoEntregaExportRecord {
  return {
    deliveryDate,
    organizer: "director",
    refrigerio1: deliveredStatus,
    almuerzo: deliveredStatus,
    refrigerio2: deliveredStatus,
    auxilioTransporte: deliveredStatus,
    updatedAt: new Date(`${deliveryDate}T12:00:00.000Z`),
  };
}
