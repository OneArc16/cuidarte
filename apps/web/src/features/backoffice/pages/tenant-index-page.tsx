import { type TenantStatusFilter } from "@cuidarte/contracts";
import { Plus } from "lucide-react";
import { useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { TenantTable } from "../components/tenant-table";
import { TenantToolbar } from "../components/tenant-toolbar";
import { BACKOFFICE_NEW_TENANT_PATH } from "../lib/backoffice-paths";
import { resolveApiError } from "../lib/backoffice-formatters";
import { useBackofficeTenantsQuery } from "../model/backoffice-queries";

export function BackofficeTenantIndexPage({ navigate }: { navigate: Navigate }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TenantStatusFilter>("all");
  const tenantsQuery = useBackofficeTenantsQuery({ search, status });
  const tenants = tenantsQuery.data?.tenants ?? [];

  return (
    <section
      className="backoffice-stack backoffice-stack--index"
      aria-labelledby="backoffice-title"
    >
      <h1 className="visually-hidden" id="backoffice-title">
        Tenants
      </h1>
      <button
        className="backoffice-floating-action"
        type="button"
        aria-label="Nuevo tenant"
        onClick={() => navigate(BACKOFFICE_NEW_TENANT_PATH)}
      >
        <Plus aria-hidden="true" />
      </button>

      <TenantToolbar
        search={search}
        status={status}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
      />

      {tenantsQuery.isError ? (
        <p className="form-error" role="alert">
          {resolveApiError(tenantsQuery.error)}
        </p>
      ) : null}

      <TenantTable
        isLoading={tenantsQuery.isLoading}
        tenants={tenants}
        onOpenTenant={(tenantPath) => navigate(tenantPath)}
      />
    </section>
  );
}
