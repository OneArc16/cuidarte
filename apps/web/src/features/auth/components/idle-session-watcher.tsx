import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  readLastActivityAt,
  readLastHeartbeatAt,
  writeLastActivityAt,
  writeLastHeartbeatAt,
} from "../lib/idle-session-storage";

export const IDLE_WARNING_MS = 2 * 60 * 1000;
export const ACTIVITY_HEARTBEAT_INTERVAL_MS = 60 * 1000;
const TICK_MS = 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 1000;
const ACTIVITY_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
] as const;

type IdleSessionWatcherProps = {
  idleTimeoutMs: number;
  onActivityHeartbeat: () => void;
  onTimeout: () => void;
};

export function IdleSessionWatcher({
  idleTimeoutMs,
  onActivityHeartbeat,
  onTimeout,
}: IdleSessionWatcherProps) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const isWarningVisibleRef = useRef(false);
  const hasTimedOutRef = useRef(false);
  const callbacksRef = useRef({ onActivityHeartbeat, onTimeout });
  callbacksRef.current = { onActivityHeartbeat, onTimeout };

  useEffect(() => {
    // Mounting means the server just confirmed an active session, so this tab counts
    // as activity and the server is told right away (heartbeat clock reset to zero).
    writeLastActivityAt(Date.now());
    writeLastHeartbeatAt(0);
    hasTimedOutRef.current = false;

    function registerActivity() {
      // While the warning is open only the explicit "Seguir conectado" action counts.
      if (isWarningVisibleRef.current) {
        return;
      }

      const now = Date.now();
      const lastActivityAt = readLastActivityAt() ?? 0;

      if (now - lastActivityAt >= ACTIVITY_WRITE_THROTTLE_MS) {
        writeLastActivityAt(now);
      }
    }

    function tick() {
      if (hasTimedOutRef.current) {
        return;
      }

      const now = Date.now();
      const lastActivityAt = readLastActivityAt() ?? now;
      const idleMs = now - lastActivityAt;

      if (idleMs >= idleTimeoutMs) {
        hasTimedOutRef.current = true;
        isWarningVisibleRef.current = false;
        setRemainingMs(null);
        callbacksRef.current.onTimeout();
        return;
      }

      const lastHeartbeatAt = readLastHeartbeatAt() ?? 0;

      if (
        lastActivityAt > lastHeartbeatAt &&
        now - lastHeartbeatAt >= ACTIVITY_HEARTBEAT_INTERVAL_MS
      ) {
        writeLastHeartbeatAt(now);
        callbacksRef.current.onActivityHeartbeat();
      }

      const isWarning = idleMs >= idleTimeoutMs - IDLE_WARNING_MS;
      isWarningVisibleRef.current = isWarning;
      setRemainingMs(isWarning ? idleTimeoutMs - idleMs : null);
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, registerActivity, { capture: true, passive: true });
    }

    tick();
    const intervalId = window.setInterval(tick, TICK_MS);

    return () => {
      window.clearInterval(intervalId);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, registerActivity, { capture: true });
      }
    };
  }, [idleTimeoutMs]);

  function stayConnected() {
    const now = Date.now();
    isWarningVisibleRef.current = false;
    writeLastActivityAt(now);
    writeLastHeartbeatAt(now);
    setRemainingMs(null);
    callbacksRef.current.onActivityHeartbeat();
  }

  if (remainingMs === null) {
    return null;
  }

  return (
    <div className="idle-session-dialog-backdrop" role="presentation">
      <section
        className="idle-session-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-session-dialog-title"
        aria-describedby="idle-session-dialog-message"
      >
        <span className="idle-session-dialog__icon" aria-hidden="true">
          <Clock />
        </span>
        <h2 id="idle-session-dialog-title">Tu sesión está por cerrarse</h2>
        <p id="idle-session-dialog-message">
          Por seguridad cerraremos tu sesión por inactividad en{" "}
          <strong>{formatRemainingTime(remainingMs)}</strong>. Si sigues trabajando, selecciona
          «Seguir conectado».
        </p>
        <button
          className="idle-session-dialog__action"
          type="button"
          autoFocus
          onClick={stayConnected}
        >
          Seguir conectado
        </button>
      </section>
    </div>
  );
}

function formatRemainingTime(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
