import { type AuthUser } from "@cuidarte/contracts";
import { Plus } from "lucide-react";
import { useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { AlimentacionTable } from "../components/alimentacion-table";
import { AlimentacionToolbar } from "../components/alimentacion-toolbar";
import {
  REGISTRO_ALIMENTACION_NEW_PATH,
  buildAlimentacionEditPath,
} from "../lib/alimentacion-paths";
import { canManageAlimentacion } from "../lib/alimentacion-permissions";
import {
  getTodayDateInputValue,
  resolveAlimentacionApiError,
} from "../lib/alimentacion-formatters";
import {
  useAlimentacionListQuery,
  useAlimentacionTenantOptionsQuery,
} from "../model/alimentacion-queries";

type AlimentacionIndexPageProps = {
  navigate: Navigate;
  user: AuthUser;
};

export function AlimentacionIndexPage({ navigate, user }: AlimentacionIndexPageProps) {
  const [search, setSearch] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(getTodayDateInputValue());
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const showTenantFilter = user.role === "super_admin";
  const tenantOptionsQuery = useAlimentacionTenantOptionsQuery(showTenantFilter);
  const canManageRecords = canManageAlimentacion(user);
  const registrosQuery = useAlimentacionListQuery({
    search,
    deliveryDate: deliveryDate.trim() === "" ? null : deliveryDate,
    tenantId: showTenantFilter
      ? selectedTenantId === ""
        ? null
        : selectedTenantId
      : user.tenantId,
  });

  return (
    <section className="alimentacion-stack" aria-labelledby="alimentacion-title">
      <h1 className="visually-hidden" id="alimentacion-title">
        Registro de alimentación
      </h1>

      <AlimentacionToolbar
        deliveryDate={deliveryDate}
        isTenantOptionsLoading={tenantOptionsQuery.isLoading}
        search={search}
        selectedTenantId={selectedTenantId}
        showTenantFilter={showTenantFilter}
        tenantOptions={tenantOptionsQuery.data?.tenants ?? []}
        onDateChange={setDeliveryDate}
        onSearchChange={setSearch}
        onTenantChange={setSelectedTenantId}
      />

      {registrosQuery.isError ? (
        <p className="form-error" role="alert">
          {resolveAlimentacionApiError(registrosQuery.error)}
        </p>
      ) : null}

      <AlimentacionTable
        canManageAlimentacion={canManageRecords}
        isLoading={registrosQuery.isLoading}
        records={registrosQuery.data?.registros ?? []}
        showTenantColumn={showTenantFilter}
        onOpenEdit={(recordId) => navigate(buildAlimentacionEditPath(recordId))}
      />

      {canManageRecords ? (
        <button
          className="alimentacion-floating-action"
          type="button"
          aria-label="Agregar registro de alimentación"
          title="Agregar registro de alimentación"
          onClick={() => navigate(REGISTRO_ALIMENTACION_NEW_PATH)}
        >
          <Plus aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}
