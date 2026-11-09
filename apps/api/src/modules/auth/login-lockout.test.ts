import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loginRequestSchema } from "@cuidarte/contracts";

import { getLoginLockMinutesLeft, registerFailedLoginAttempt } from "./login-lockout";

const now = new Date("2026-11-09T12:00:00.000Z");
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
const minutesAhead = (minutes: number) => new Date(now.getTime() + minutes * 60_000);
const clean = { failedLoginAttempts: 0, lastFailedLoginAt: null, lockedUntil: null };

describe("bloqueo de inicio de sesion por intentos fallidos", () => {
  it("bloquea 3 minutos al quinto intento fallido seguido", () => {
    let state: Parameters<typeof registerFailedLoginAttempt>[0] = clean;

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      state = registerFailedLoginAttempt(state, now);
      assert.equal(state.failedLoginAttempts, attempt);
      assert.equal(state.lockedUntil, null);
    }

    state = registerFailedLoginAttempt(state, now);
    assert.equal(state.failedLoginAttempts, 5);
    assert.deepEqual(state.lockedUntil, minutesAhead(3));
  });

  it("olvida los fallos de hace mas de 15 minutos", () => {
    const state = registerFailedLoginAttempt(
      { failedLoginAttempts: 4, lastFailedLoginAt: minutesAgo(16), lockedUntil: null },
      now,
    );

    assert.equal(state.failedLoginAttempts, 1);
    assert.equal(state.lockedUntil, null);
    assert.deepEqual(state.lastFailedLoginAt, now);
  });

  it("cuenta como seguidos los fallos dentro de los 15 minutos", () => {
    const state = registerFailedLoginAttempt(
      { failedLoginAttempts: 4, lastFailedLoginAt: minutesAgo(10), lockedUntil: null },
      now,
    );

    assert.equal(state.failedLoginAttempts, 5);
    assert.deepEqual(state.lockedUntil, minutesAhead(3));
  });

  it("empieza de cero cuando el bloqueo anterior ya vencio", () => {
    const state = registerFailedLoginAttempt(
      { failedLoginAttempts: 5, lastFailedLoginAt: minutesAgo(15), lockedUntil: minutesAgo(1) },
      now,
    );

    assert.equal(state.failedLoginAttempts, 1);
    assert.equal(state.lockedUntil, null);
  });

  it("trata los usuarios sin fecha del ultimo fallo como contador vencido", () => {
    const state = registerFailedLoginAttempt(
      { failedLoginAttempts: 7, lastFailedLoginAt: null, lockedUntil: null },
      now,
    );

    assert.equal(state.failedLoginAttempts, 1);
  });

  it("informa los minutos que faltan solo mientras la cuenta esta bloqueada", () => {
    assert.equal(getLoginLockMinutesLeft({ lockedUntil: null }, now), null);
    assert.equal(getLoginLockMinutesLeft({ lockedUntil: minutesAgo(1) }, now), null);
    assert.equal(getLoginLockMinutesLeft({ lockedUntil: now }, now), null);
    assert.equal(getLoginLockMinutesLeft({ lockedUntil: minutesAhead(15) }, now), 15);
    assert.equal(
      getLoginLockMinutesLeft({ lockedUntil: new Date(now.getTime() + 61_000) }, now),
      2,
    );
  });
});

describe("solicitud de inicio de sesion", () => {
  it("quita los espacios de los extremos de la contrasena como al guardarla", () => {
    const request = loginRequestSchema.parse({
      email: "Usuario@Centro.test",
      password: "  Clave Segura 123 ",
    });

    assert.equal(request.password, "Clave Segura 123");
    assert.equal(request.email, "usuario@centro.test");
  });

  it("sigue exigiendo una contrasena no vacia", () => {
    assert.equal(loginRequestSchema.safeParse({ email: "a@b.co", password: "   " }).success, false);
  });
});
