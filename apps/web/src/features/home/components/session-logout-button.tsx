import { LogOut } from "lucide-react";

import { useLogoutMutation } from "@/features/auth/model/auth-queries";

type SessionLogoutButtonProps = {
  className: string;
  onLogoutSuccess: () => void;
};

export function SessionLogoutButton({ className, onLogoutSuccess }: SessionLogoutButtonProps) {
  const logoutMutation = useLogoutMutation();

  return (
    <button
      className={className}
      disabled={logoutMutation.isPending}
      type="button"
      onClick={() => {
        logoutMutation.mutate(undefined, {
          onSuccess: () => {
            onLogoutSuccess();
          },
        });
      }}
    >
      <LogOut aria-hidden="true" />
      <span>{logoutMutation.isPending ? "Cerrando..." : "Cerrar sesion"}</span>
    </button>
  );
}
