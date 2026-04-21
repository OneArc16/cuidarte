import { type LoginRequest } from "@cuidarte/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as authApi from "../api/auth-api";

export const authQueryKeys = {
  me: ["auth", "me"] as const,
};

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: authApi.getMe,
    retry: false,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LoginRequest) => authApi.login(request),
    onSuccess: (session) => {
      queryClient.setQueryData(authQueryKeys.me, { user: session.user });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(authQueryKeys.me, { user: null });
    },
  });
}
