import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IdleSessionWatcher } from "./idle-session-watcher";

const MINUTE_MS = 60 * 1000;
const IDLE_TIMEOUT_MS = 30 * MINUTE_MS;

function renderWatcher() {
  const onActivityHeartbeat = vi.fn();
  const onTimeout = vi.fn();

  render(
    <IdleSessionWatcher
      idleTimeoutMs={IDLE_TIMEOUT_MS}
      onActivityHeartbeat={onActivityHeartbeat}
      onTimeout={onTimeout}
    />,
  );

  return { onActivityHeartbeat, onTimeout };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("IdleSessionWatcher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-06T08:00:00.000Z"));
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("registers the session activity as soon as it mounts", () => {
    const { onActivityHeartbeat } = renderWatcher();

    expect(onActivityHeartbeat).toHaveBeenCalledTimes(1);
  });

  it("warns two minutes before closing an idle session and counts down", () => {
    renderWatcher();

    advance(28 * MINUTE_MS - 1000);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    advance(1000);
    const dialog = screen.getByRole("alertdialog", { name: "Tu sesión está por cerrarse" });
    expect(dialog).toHaveTextContent("2:00");

    advance(30 * 1000);
    expect(dialog).toHaveTextContent("1:30");
  });

  it("closes the session once the idle timeout elapses", () => {
    const { onTimeout } = renderWatcher();

    advance(IDLE_TIMEOUT_MS - 1000);
    expect(onTimeout).not.toHaveBeenCalled();

    advance(1000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    advance(5 * MINUTE_MS);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("keeps the session open when the user chooses to stay connected", () => {
    const { onActivityHeartbeat, onTimeout } = renderWatcher();

    advance(28 * MINUTE_MS);
    fireEvent.click(screen.getByRole("button", { name: "Seguir conectado" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onActivityHeartbeat).toHaveBeenCalledTimes(2);

    advance(27 * MINUTE_MS);
    expect(onTimeout).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("postpones the timeout while the user keeps working", () => {
    const { onActivityHeartbeat, onTimeout } = renderWatcher();

    advance(20 * MINUTE_MS);
    fireEvent.keyDown(window, { key: "a" });
    advance(1000);

    expect(onActivityHeartbeat).toHaveBeenCalledTimes(2);

    advance(20 * MINUTE_MS);
    expect(onTimeout).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("sends at most one activity heartbeat per minute", () => {
    const { onActivityHeartbeat } = renderWatcher();

    for (let second = 0; second < 30; second += 2) {
      fireEvent.pointerDown(window);
      advance(2000);
    }

    expect(onActivityHeartbeat).toHaveBeenCalledTimes(1);

    advance(30 * 1000);
    expect(onActivityHeartbeat).toHaveBeenCalledTimes(2);
  });

  it("ignores incidental activity while the warning is open", () => {
    const { onTimeout } = renderWatcher();

    advance(28 * MINUTE_MS);
    fireEvent.pointerMove(window);
    fireEvent.keyDown(window, { key: "a" });

    advance(2 * MINUTE_MS);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("shares activity across tabs through local storage", () => {
    const { onTimeout } = renderWatcher();

    advance(25 * MINUTE_MS);
    window.localStorage.setItem("cuidarte:last-activity-at", String(Date.now()));

    advance(25 * MINUTE_MS);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
