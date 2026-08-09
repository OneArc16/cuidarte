import { type BackofficeTenantDetail } from "@cuidarte/contracts";
import { ShieldCheck } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { toast } from "sonner";

import { resolveEmpleadosApiError } from "../../empleados/lib/empleados-formatters";
import { useEmpleadosQuery } from "../../empleados/model/empleados-queries";
import {
  useClearTenantActiveSignerMutation,
  useSetTenantActiveSignerMutation,
} from "../../empleados/model/empleados-queries";
import * as empleadosApi from "../../empleados/api/empleados-api";

type TenantActiveSignerPanelProps = {
  tenant: BackofficeTenantDetail["tenant"];
  activeSigner: BackofficeTenantDetail["activeSigner"];
};

export function TenantActiveSignerPanel({ tenant, activeSigner }: TenantActiveSignerPanelProps) {
  const empleadosQuery = useEmpleadosQuery({ search: "" });
  const activateSignerMutation = useSetTenantActiveSignerMutation(tenant.id);
  const clearSignerMutation = useClearTenantActiveSignerMutation(tenant.id);

  const directors = (empleadosQuery.data?.empleados ?? []).filter(
    (empleado) => empleado.tenantId === tenant.id && empleado.role === "director",
  );
  const directorDetailsQueries = useQueries({
    queries: directors.map((director) => ({
      queryKey: ["empleados", director.id, "detail", "tenant-active-signer"] as const,
      queryFn: () => empleadosApi.getEmpleado(director.id),
      retry: false,
      enabled: true,
    })),
  });

  if (empleadosQuery.isLoading) {
    return (
      <section className="tenant-branding-panel" aria-labelledby="tenant-active-signer-title">
        <div className="tenant-branding-panel__header">
          <div>
            <p className="eyebrow">Firmante activo</p>
            <h2 id="tenant-active-signer-title">Directores del centro</h2>
          </div>
        </div>
        <p>Cargando directores del centro...</p>
      </section>
    );
  }

  if (empleadosQuery.isError) {
    return (
      <section className="tenant-branding-panel" aria-labelledby="tenant-active-signer-title">
        <div className="tenant-branding-panel__header">
          <div>
            <p className="eyebrow">Firmante activo</p>
            <h2 id="tenant-active-signer-title">Directores del centro</h2>
          </div>
        </div>
        <p className="form-error" role="alert">
          {resolveEmpleadosApiError(empleadosQuery.error)}
        </p>
      </section>
    );
  }

  return (
    <section className="tenant-branding-panel" aria-labelledby="tenant-active-signer-title">
      <div className="tenant-branding-panel__header">
        <div>
          <p className="eyebrow">Firmante activo</p>
          <h2 id="tenant-active-signer-title">Directores del centro</h2>
        </div>
        <span className={`tenant-branding-status${activeSigner === null ? " tenant-branding-status--pending" : ""}`}>
          {activeSigner === null ? "Sin firmante" : "Firmante activo"}
        </span>
      </div>

      <div className="tenant-branding-panel__body">
        <div className="tenant-branding-preview tenant-branding-preview--empty">
          <div className="tenant-branding-preview__placeholder">
            <ShieldCheck aria-hidden="true" />
            <strong>Firmante actual</strong>
            <span>
              {activeSigner === null
                ? "El centro aun no tiene un firmante activo."
                : "El formato PDF usara la firma activa configurada en este centro."}
            </span>
          </div>
        </div>

        <div className="tenant-branding-panel__content">
          {directors.length === 0 ? (
            <p className="tenant-branding-panel__warning">
              Este centro no tiene directores activos disponibles para firmar.
            </p>
          ) : (
            <div className="tenant-active-signer-grid">
              {directors.map((director, index) => {
                const detailQuery = directorDetailsQueries[index];
                const directorDetail = detailQuery?.data;
                const signature = directorDetail?.latestSignature ?? null;
                const isCurrentActive = activeSigner?.employeeId === director.id;
                const canActivate = signature !== null && !activateSignerMutation.isPending;
                const canToggle = !activateSignerMutation.isPending && !clearSignerMutation.isPending;
                const detailError = detailQuery?.error;
                const actionLabel = isCurrentActive ? "Desactivar firmante" : "Activar firmante";

                return (
                  <article className="tenant-active-signer-card" key={director.id}>
                    <div className="tenant-active-signer-card__header">
                      <div>
                        <strong>{director.fullName}</strong>
                        <p>{director.email}</p>
                      </div>
                      <span data-state={isCurrentActive ? "active" : "idle"}>
                        {isCurrentActive ? "Activo" : "Disponible"}
                      </span>
                    </div>

                    <dl className="tenant-active-signer-card__meta">
                      <div>
                        <dt>Firma</dt>
                        <dd>{signature?.originalName ?? "Sin firma cargada"}</dd>
                      </div>
                      <div>
                        <dt>Subida</dt>
                        <dd>
                          {signature === null
                            ? "No disponible"
                            : new Intl.DateTimeFormat("es-CO", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(signature.createdAt))}
                        </dd>
                      </div>
                    </dl>

                    {detailQuery?.isError === true && detailError !== undefined ? (
                      <p className="form-error" role="alert">
                        {resolveEmpleadosApiError(detailError)}
                      </p>
                    ) : null}

                    <button
                      className="outline-action"
                      type="button"
                      disabled={!canToggle || (!isCurrentActive && !canActivate)}
                      onClick={() => {
                        if (isCurrentActive) {
                          const confirmed = window.confirm(
                            `¿Deseas desactivar a ${director.fullName} como firmante del centro?`,
                          );

                          if (!confirmed) {
                            return;
                          }

                          clearSignerMutation.mutate(undefined, {
                            onSuccess: () => {
                              toast.success("Firmante activo desactivado.");
                            },
                          });

                          return;
                        }

                        if (signature === null) {
                          return;
                        }

                        const confirmed = window.confirm(
                          `¿Deseas activar a ${director.fullName} como firmante del centro?`,
                        );

                        if (!confirmed) {
                          return;
                        }

                        activateSignerMutation.mutate(
                          {
                            employeeId: director.id,
                            signatureVersionId: signature.id,
                          },
                          {
                            onSuccess: () => {
                              toast.success("Firmante activo del centro actualizado.");
                            },
                          },
                        );
                      }}
                    >
                      {actionLabel}
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          {activateSignerMutation.isError ? (
            <p className="form-error" role="alert">
              {resolveEmpleadosApiError(activateSignerMutation.error)}
            </p>
          ) : null}

          {clearSignerMutation.isError ? (
            <p className="form-error" role="alert">
              {resolveEmpleadosApiError(clearSignerMutation.error)}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
