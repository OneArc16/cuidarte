import { strict as assert } from "node:assert";
import test from "node:test";

import {
  findNextAvailableActividadGrupalActaSequence,
  formatActividadGrupalActaNumber,
  resolveActividadGrupalActaOrganizer,
  usesSharedActividadGrupalActaSeries,
} from "./actividad-grupal-acta-number";

test("genera consecutivos por serie de equipo", () => {
  assert.equal(formatActividadGrupalActaNumber("enfermeria", 1), "SALUD-001");
  assert.equal(formatActividadGrupalActaNumber("medico", 2), "SALUD-002");
  assert.equal(formatActividadGrupalActaNumber("trabajadora_social", 1), "PSICO-001");
  assert.equal(formatActividadGrupalActaNumber("psicologa", 2), "PSICO-002");
  assert.equal(formatActividadGrupalActaNumber("nutricionista", 2), "NUTRI-002");
  assert.equal(formatActividadGrupalActaNumber("medico", 1000), "SALUD-1000");
});

test("resuelve una clave canonica por cada equipo que comparte serie", () => {
  assert.equal(resolveActividadGrupalActaOrganizer("enfermeria"), "medico");
  assert.equal(resolveActividadGrupalActaOrganizer("medico"), "medico");
  assert.equal(resolveActividadGrupalActaOrganizer("trabajadora_social"), "psicologa");
  assert.equal(resolveActividadGrupalActaOrganizer("psicologa"), "psicologa");
  assert.equal(resolveActividadGrupalActaOrganizer("director"), "director");
});

test("identifica los roles que se filtran por una serie compartida", () => {
  assert.equal(usesSharedActividadGrupalActaSeries("medico"), true);
  assert.equal(usesSharedActividadGrupalActaSeries("enfermeria"), true);
  assert.equal(usesSharedActividadGrupalActaSeries("psicologa"), true);
  assert.equal(usesSharedActividadGrupalActaSeries("trabajadora_social"), true);
  assert.equal(usesSharedActividadGrupalActaSeries("director"), false);
});

test("rechaza secuencias invalidas", () => {
  assert.throws(() => formatActividadGrupalActaNumber("enfermeria", 0));
  assert.throws(() => formatActividadGrupalActaNumber("enfermeria", 1.5));
});

test("reutiliza el primer consecutivo libre aunque existan consecutivos posteriores", () => {
  assert.equal(findNextAvailableActividadGrupalActaSequence([1, 2, 3, 5]), 4);
  assert.equal(findNextAvailableActividadGrupalActaSequence([2, 3, 5]), 4);
});
