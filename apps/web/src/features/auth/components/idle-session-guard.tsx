import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { ApiError } from "@/shared/api/api-error";

import * as authApi from "../api/auth-api";
import { rememberLogoutReason, writeLastHeartbeatAt } from "../lib/idle-session-storage";
import { authQueryKeys } from "../model/auth-queries";
import { ACTIVITY_HEARTBEAT_INTERVAL_MS, IdleSessionWatcher } from "./idle-session-watcher";

const HEARTBEAT_RETRY_DELAY_MS = 10 * 1000;

export const DEFAULT_IDLE_TIMEOUT_SECONDS = 30 * 60;

type IdleSessionGuardProps = {
  idleTimeoutSeconds: number | undefined;
};

export function IdleSessionGuard({ idleTimeoutSeconds }: IdleSessionGuardProps) {
  const queryClient = useQueryClient();

  const handleActivityHeartbeat = useCallback(() => {
    authApi.registerActivity().catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        void queryClient.invalidateQueries({ queryKey: authQueryKeys.me });
        return;
      }

      // Transient failure: let the watcher retry soon instead of waiting a full interval,
      // so the server does not expire a session the user is actively using.
      writeLastHeartbeatAt(Date.now() - ACTIVITY_HEARTBEAT_INTERVAL_MS + HEARTBEAT_RETRY_DELAY_MS);
    });
  }, [queryClient]);

  const handleTimeout = useCallback(() => {
    rememberLogoutReason("idle");
    void authApi
      .logout()
      .catch(() => undefined)
      .finally(() => {
        queryClient.setQueryData(authQueryKeys.me, { user: null });
      });
  }, [queryClient]);

  return (
    <IdleSessionWatcher
      idleTimeoutMs={(idleTimeoutSeconds ?? DEFAULT_IDLE_TIMEOUT_SECONDS) * 1000}
      onActivityHeartbeat={handleActivityHeartbeat}
      onTimeout={handleTimeout}
    />
  );
}
