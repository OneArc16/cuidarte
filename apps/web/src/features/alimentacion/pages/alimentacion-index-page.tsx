import { type AuthUser } from "@cuidarte/contracts";
import { Plus } from "lucide-react";
import { useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { exportAlimentacionFormatoEntregaPdf } from "../api/alimentacion-api";
import { AlimentacionTable } from "../components/alimentacion-table";
import { AlimentacionToolbar } from "../components/alimentacion-toolbar";
import {
  REGISTRO_ALIMENTACION_NEW_PATH,
  buildAlimentacionEditPath,
} from "../lib/alimentacion-paths";
import { downloadBlob } from "../lib/download-file";
import { canManageAlimentacion } from "../lib/alimentacion-permissions";
import {
  getCurrentMonthInputValue,
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
  const [deliveryMonth, setDeliveryMonth] = useState(getCurrentMonthInputValue());
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [exportingAdultoMayorId, setExportingAdultoMayorId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const showTenantFilter = user.role === "super_admin";
  const tenantOptionsQuery = useAlimentacionTenantOptionsQuery(showTenantFilter);
  const canManageRecords = canManageAlimentacion(user);
  const effectiveDeliveryMonth = deliveryMonth.trim() === "" ? null : deliveryMonth;
  const registrosQuery = useAlimentacionListQuery({
    search,
    deliveryMonth: effectiveDeliveryMonth,
    tenantId: showTenantFilter
      ? selectedTenantId === ""
        ? null
        : selectedTenantId
      : user.tenantId,
  });

  async function handleExportFormato(params: {
    adultoMayorId: string;
    documentNumber: string;
    fullName: string;
  }) {
    if (effectiveDeliveryMonth === null) {
      setExportError("Selecciona un mes para exportar el formato de alimentación.");
      return;
    }

    setExportingAdultoMayorId(params.adultoMayorId);
    setExportError(null);

    try {
      const blob = await exportAlimentacionFormatoEntregaPdf({
        adultoMayorId: params.adultoMayorId,
        deliveryMonth: effectiveDeliveryMonth,
      });

      downloadBlob(
        blob,
        buildFormatoEntregaFilename(params.documentNumber, effectiveDeliveryMonth),
      );
    } catch (error: unknown) {
      setExportError(resolveAlimentacionApiError(error) ?? "No fue posible completar la descarga.");
    } finally {
      setExportingAdultoMayorId(null);
    }
  }

  return (
    <section className="alimentacion-stack" aria-labelledby="alimentacion-title">
      <h1 className="visually-hidden" id="alimentacion-title">
        Registro de alimentación
      </h1>

      <AlimentacionToolbar
        deliveryMonth={deliveryMonth}
        isTenantOptionsLoading={tenantOptionsQuery.isLoading}
        search={search}
        selectedTenantId={selectedTenantId}
        showTenantFilter={showTenantFilter}
        tenantOptions={tenantOptionsQuery.data?.tenants ?? []}
        onMonthChange={setDeliveryMonth}
        onSearchChange={setSearch}
        onTenantChange={setSelectedTenantId}
      />

      {registrosQuery.isError ? (
        <p className="form-error" role="alert">
          {resolveAlimentacionApiError(registrosQuery.error)}
        </p>
      ) : null}

      {exportError !== null ? (
        <p className="form-error" role="alert">
          {exportError}
        </p>
      ) : null}

      <AlimentacionTable
        canManageAlimentacion={canManageRecords}
        exportingAdultoMayorId={exportingAdultoMayorId}
        isLoading={registrosQuery.isLoading}
        records={registrosQuery.data?.registros ?? []}
        showTenantColumn={showTenantFilter}
        onExportFormato={handleExportFormato}
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

function buildFormatoEntregaFilename(documentNumber: string, deliveryMonth: string): string {
  const sanitizedDocument = documentNumber.replace(/[^a-zA-Z0-9._-]/g, "-");

  return `formato-entrega-${sanitizedDocument}-${deliveryMonth}.pdf`;
}
