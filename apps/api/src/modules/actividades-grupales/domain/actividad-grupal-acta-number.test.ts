import { strict as assert } from "node:assert";
import test from "node:test";

import { formatActividadGrupalActaNumber } from "./actividad-grupal-acta-number";

test("genera consecutivos por prefijo de organizador", () => {
  assert.equal(formatActividadGrupalActaNumber("enfermeria", 1), "ENFER-001");
  assert.equal(formatActividadGrupalActaNumber("nutricionista", 2), "NUTRI-002");
  assert.equal(formatActividadGrupalActaNumber("medico", 1000), "MED-1000");
});

test("rechaza secuencias invalidas", () => {
  assert.throws(() => formatActividadGrupalActaNumber("enfermeria", 0));
  assert.throws(() => formatActividadGrupalActaNumber("enfermeria", 1.5));
});
