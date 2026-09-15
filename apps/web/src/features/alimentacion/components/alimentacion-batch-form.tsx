import {
  type AlimentacionAdultoOption,
  type AlimentacionStatus,
  type AlimentacionTenantOption,
  type CreateAlimentacionBatchRequest,
} from "@cuidarte/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, CheckCheck, Eraser, Search, Trash2, UsersRound } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";

import { useAlimentacionAdultosMayoresOptionsQuery } from "../model/alimentacion-queries";
import {
  resolveAlimentacionApiError,
  formatAlimentacionOrganizer,
  formatAlimentacionStatus,
  getAlimentacionOrganizerOptions,
  getAlimentacionStatusOptions,
} from "../lib/alimentacion-formatters";
import {
  type AlimentacionBatchFormValues,
  type AlimentacionBatchRowValues,
  alimentacionBatchFormSchema,
  createDefaultAlimentacionBatchFormValues,
  createDefaultAlimentacionBatchRow,
  isAlimentacionBatchRowComplete,
  toCreateAlimentacionBatchRequest,
} from "../schemas/alimentacion-batch-form.schema";
import { AlimentacionFieldGroup } from "./alimentacion-field-group";

type AlimentacionBatchFormProps = {
  error: string | null;
  isPending: boolean;
  isTenantOptionsLoading: boolean;
  prefilledAdultoMayor: AlimentacionAdultoOption | null;
  selectedTenantId: string;
  shouldSelectTenant: boolean;
  tenantOptions: AlimentacionTenantOption[];
  onCancel: () => void;
  onSubmit: (request: CreateAlimentacionBatchRequest) => void;
  onTenantChange: (tenantId: string) => void;
};

type AlimentacionBatchStatusField = Exclude<keyof AlimentacionBatchRowValues, "adultoMayor">;

const DELIVERED_STATUS: AlimentacionStatus = "entregado";
const UNSET_STATUS = "";

function withUniformStatus(
  row: AlimentacionBatchRowValues,
  status: AlimentacionStatus | "",
): AlimentacionBatchRowValues {
  return {
    ...row,
    refrigerio1: status,
    almuerzo: status,
    refrigerio2: status,
    auxilioTransporte: status,
  };
}

export function AlimentacionBatchForm({
  error,
  isPending,
  isTenantOptionsLoading,
  onCancel,
  onSubmit,
  onTenantChange,
  prefilledAdultoMayor,
  selectedTenantId,
  shouldSelectTenant,
  tenantOptions,
}: AlimentacionBatchFormProps) {
  const [adultoSearch, setAdultoSearch] = useState("");
  const [selectedAdultoSearch, setSelectedAdultoSearch] = useState("");
  const [selectedRows, setSelectedRows] = useState<AlimentacionBatchRowValues[]>([]);
  const [selectedRowsError, setSelectedRowsError] = useState<string | null>(null);
  const deferredAdultoSearch = useDeferredValue(adultoSearch.trim());
  const deferredSelectedAdultoSearch = useDeferredValue(selectedAdultoSearch.trim());
  const form = useForm<AlimentacionBatchFormValues>({
    resolver: zodResolver(alimentacionBatchFormSchema) as Resolver<AlimentacionBatchFormValues>,
    defaultValues: createDefaultAlimentacionBatchFormValues(),
    mode: "onBlur",
  });
  const { setError, setValue, watch } = form;
  const deliveryDate = watch("deliveryDate");
  const canSearchAdults =
    deliveryDate.trim() !== "" && (!shouldSelectTenant || selectedTenantId.trim() !== "");
  const adultosOptionsQuery = useAlimentacionAdultosMayoresOptionsQuery(
    {
      search: deferredAdultoSearch,
      deliveryDate,
      limit: "suggestions",
      tenantId: selectedTenantId.trim() === "" ? null : selectedTenantId,
    },
    canSearchAdults && deferredAdultoSearch !== "",
  );
  const allAdultosOptionsQuery = useAlimentacionAdultosMayoresOptionsQuery(
    {
      search: "",
      deliveryDate,
      limit: "all",
      tenantId: selectedTenantId.trim() === "" ? null : selectedTenantId,
    },
    false,
  );
  const suggestionOptions = (adultosOptionsQuery.data?.adultosMayores ?? []).filter(
    (adultoMayor) => !selectedRows.some((row) => row.adultoMayor.id === adultoMayor.id),
  );
  const filteredSelectedRows = useMemo(() => {
    const search = normalizeSearchValue(deferredSelectedAdultoSearch);

    if (search === "") {
      return selectedRows;
    }

    return selectedRows.filter((row) =>
      [row.adultoMayor.fullName, row.adultoMayor.documentNumber].some((value) =>
        normalizeSearchValue(value).includes(search),
      ),
    );
  }, [deferredSelectedAdultoSearch, selectedRows]);

  useEffect(() => {
    setValue("tenantId", selectedTenantId, { shouldDirty: false });
  }, [selectedTenantId, setValue]);

  useEffect(() => {
    if (prefilledAdultoMayor === null) {
      return;
    }

    setSelectedRows((currentRows) =>
      currentRows.some((row) => row.adultoMayor.id === prefilledAdultoMayor.id)
        ? currentRows
        : [...currentRows, createDefaultAlimentacionBatchRow(prefilledAdultoMayor)],
    );
  }, [prefilledAdultoMayor]);

  useEffect(() => {
    if (!shouldSelectTenant || selectedTenantId.trim() === "") {
      return;
    }

    setSelectedRows((currentRows) =>
      currentRows.filter((row) => row.adultoMayor.tenantId === selectedTenantId),
    );
  }, [selectedTenantId, shouldSelectTenant]);

  function getError(field: keyof AlimentacionBatchFormValues): string | undefined {
    const message = form.formState.errors[field]?.message;

    return typeof message === "string" ? message : undefined;
  }

  function addAdultoMayor(adultoMayor: AlimentacionAdultoOption) {
    if (adultoMayor.alreadyRegistered) {
      toast.warning(
        `${adultoMayor.fullName} ya tiene alimentos registrados para la fecha seleccionada.`,
      );
      return;
    }

    setSelectedRows((currentRows) => [
      ...currentRows,
      createDefaultAlimentacionBatchRow(adultoMayor),
    ]);
    setSelectedRowsError(null);
    setAdultoSearch("");
  }

  async function addAllAdultosMayores() {
    const result = await allAdultosOptionsQuery.refetch();
    const adultosMayores = result.data?.adultosMayores ?? [];
    const alreadyRegisteredCount = adultosMayores.filter(
      (adultoMayor) => adultoMayor.alreadyRegistered,
    ).length;

    setSelectedRows((currentRows) => {
      const selectedIds = new Set(currentRows.map((row) => row.adultoMayor.id));
      const newRows = adultosMayores
        .filter((adultoMayor) => !adultoMayor.alreadyRegistered)
        .filter((adultoMayor) => !selectedIds.has(adultoMayor.id))
        .map((adultoMayor) => createDefaultAlimentacionBatchRow(adultoMayor));

      return newRows.length === 0 ? currentRows : [...currentRows, ...newRows];
    });
    setSelectedRowsError(null);
    setAdultoSearch("");

    if (alreadyRegisteredCount > 0) {
      toast.warning(
        `${alreadyRegisteredCount} adulto${alreadyRegisteredCount === 1 ? "" : "s"} mayor${alreadyRegisteredCount === 1 ? "" : "es"} ya tiene${alreadyRegisteredCount === 1 ? "" : "n"} alimentos registrados para la fecha seleccionada y fue${alreadyRegisteredCount === 1 ? "" : "ron"} omitido${alreadyRegisteredCount === 1 ? "" : "s"}.`,
      );
    }
  }

  function removeAdultoMayor(adultoMayorId: string) {
    setSelectedRows((currentRows) =>
      currentRows.filter((row) => row.adultoMayor.id !== adultoMayorId),
    );
  }

  function updateStatus(
    adultoMayorId: string,
    field: AlimentacionBatchStatusField,
    value: AlimentacionStatus | "",
  ) {
    setSelectedRows((currentRows) =>
      currentRows.map((row) =>
        row.adultoMayor.id === adultoMayorId
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
    setSelectedRowsError(null);
  }

  function markAdultoMayorAsDelivered(adultoMayorId: string) {
    setSelectedRows((currentRows) =>
      currentRows.map((row) =>
        row.adultoMayor.id === adultoMayorId ? withUniformStatus(row, DELIVERED_STATUS) : row,
      ),
    );
    setSelectedRowsError(null);
  }

  function markAllRowsAsDelivered() {
    setSelectedRows((currentRows) =>
      currentRows.map((row) => withUniformStatus(row, DELIVERED_STATUS)),
    );
    setSelectedRowsError(null);
  }

  function clearAdultoMayorStatuses(adultoMayorId: string) {
    setSelectedRows((currentRows) =>
      currentRows.map((row) =>
        row.adultoMayor.id === adultoMayorId ? withUniformStatus(row, UNSET_STATUS) : row,
      ),
    );
    setSelectedRowsError(null);
  }

  function clearAllRowsStatuses() {
    setSelectedRows((currentRows) =>
      currentRows.map((row) => withUniformStatus(row, UNSET_STATUS)),
    );
    setSelectedRowsError(null);
  }

  return (
    <form
      className="alimentacion-form"
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          if (shouldSelectTenant && values.tenantId.trim() === "") {
            setError("tenantId", {
              type: "manual",
              message: "Selecciona un centro.",
            });
            return;
          }

          if (selectedRows.length === 0) {
            setSelectedRowsError("Agrega minimo un adulto mayor para guardar el lote.");
            return;
          }

          if (!selectedRows.every(isAlimentacionBatchRowComplete)) {
            setSelectedRowsError(
              "Completa los estados de alimentacion de todos los adultos mayores agregados.",
            );
            return;
          }

          onSubmit(toCreateAlimentacionBatchRequest(values, selectedRows));
        })(event);
      }}
    >
      <section className="alimentacion-form-shell">
        <aside className="alimentacion-form-summary">
          <div className="alimentacion-form-summary__metric">
            <span className="eyebrow">Lote diario</span>
            <strong>{selectedRows.length}</strong>
            <small>Adultos mayores agregados para la fecha seleccionada.</small>
          </div>
        </aside>

        <section className="alimentacion-form-panel">
          <div className="alimentacion-form-grid">
            {shouldSelectTenant ? (
              <AlimentacionFieldGroup label="Centro" error={getError("tenantId")}>
                <select
                  aria-invalid={getError("tenantId") === undefined ? "false" : "true"}
                  disabled={isTenantOptionsLoading}
                  {...form.register("tenantId", {
                    onChange: (event) => {
                      onTenantChange(String(event.target.value));
                    },
                  })}
                >
                  <option value="">Seleccionar</option>
                  {tenantOptions.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </AlimentacionFieldGroup>
            ) : null}

            <AlimentacionFieldGroup label="Fecha" error={getError("deliveryDate")}>
              <input
                type="date"
                aria-invalid={getError("deliveryDate") === undefined ? "false" : "true"}
                {...form.register("deliveryDate")}
              />
            </AlimentacionFieldGroup>

            <AlimentacionFieldGroup label="Organizador" error={getError("organizer")}>
              <select
                aria-invalid={getError("organizer") === undefined ? "false" : "true"}
                {...form.register("organizer")}
              >
                {getAlimentacionOrganizerOptions().map((option) => (
                  <option key={option} value={option}>
                    {formatAlimentacionOrganizer(option)}
                  </option>
                ))}
              </select>
            </AlimentacionFieldGroup>
          </div>
        </section>
      </section>

      <section className="alimentacion-form-panel">
        <div className="alimentacion-form-panel__header">
          <div>
            <h2>Agregar adultos mayores</h2>
            <p className="muted-copy">
              Busca por nombre o documento y arma el lote del día con la tabla de alimentación.
            </p>
          </div>
          <div className="alimentacion-add-adults-actions">
            <span>{selectedRows.length} agregados</span>
            <button
              className="alimentacion-soft-action"
              type="button"
              disabled={!canSearchAdults || allAdultosOptionsQuery.isFetching}
              onClick={() => {
                void addAllAdultosMayores();
              }}
            >
              <UsersRound aria-hidden="true" />
              <span>{allAdultosOptionsQuery.isFetching ? "Agregando..." : "Agregar todos"}</span>
            </button>
          </div>
        </div>

        <label className="alimentacion-search-input">
          <Search aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar por nombre o documento"
            placeholder="Buscar por nombre o documento"
            value={adultoSearch}
            onChange={(event) => setAdultoSearch(event.target.value)}
          />
        </label>

        {adultosOptionsQuery.isError ? (
          <p className="form-error" role="alert">
            {resolveAlimentacionApiError(adultosOptionsQuery.error)}
          </p>
        ) : null}

        {!canSearchAdults ? (
          <div className="alimentacion-empty-state">
            <p>
              {shouldSelectTenant && selectedTenantId.trim() === ""
                ? "Selecciona un centro para comenzar a buscar adultos mayores."
                : "Selecciona una fecha para comenzar a buscar adultos mayores."}
            </p>
          </div>
        ) : deferredAdultoSearch === "" ? (
          <div className="alimentacion-empty-state">
            <p>Escribe un nombre o documento para buscar adultos mayores.</p>
          </div>
        ) : adultosOptionsQuery.isFetching ? (
          <div className="alimentacion-empty-state" aria-live="polite">
            <p>Buscando adultos mayores...</p>
          </div>
        ) : suggestionOptions.length === 0 ? (
          <div className="alimentacion-empty-state">
            <p>No encontramos adultos mayores disponibles con ese criterio.</p>
          </div>
        ) : (
          <div className="alimentacion-suggestions">
            {suggestionOptions.map((adultoMayor) => (
              <button
                key={adultoMayor.id}
                className="alimentacion-suggestion"
                type="button"
                onClick={() => addAdultoMayor(adultoMayor)}
              >
                <UsersRound aria-hidden="true" />
                <strong>{adultoMayor.fullName}</strong>
                <small>{adultoMayor.documentNumber}</small>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="alimentacion-form-panel">
        <div className="alimentacion-form-panel__header">
          <div>
            <h2>Tabla de alimentación</h2>
          </div>
          <div className="alimentacion-batch-table-actions">
            <span>Refrigerios + Almuerzo + Transporte</span>
            <div className="alimentacion-batch-table-icon-actions">
              <button
                className="alimentacion-row-action alimentacion-row-action--success"
                type="button"
                aria-label="Marcar todos como entregados"
                title="Marcar todos como entregados"
                disabled={selectedRows.length === 0}
                onClick={markAllRowsAsDelivered}
              >
                <CheckCheck aria-hidden="true" />
              </button>
              <button
                className="alimentacion-row-action alimentacion-row-action--reset"
                type="button"
                aria-label="Desmarcar todos"
                title="Desmarcar todos"
                disabled={selectedRows.length === 0}
                onClick={clearAllRowsStatuses}
              >
                <Eraser aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {selectedRowsError !== null ? (
          <p className="form-error" role="alert">
            {selectedRowsError}
          </p>
        ) : null}

        <label className="alimentacion-search-input alimentacion-selected-search-input">
          <Search aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar adulto mayor agregado para quitarlo"
            placeholder="Buscar agregado por nombre o documento para quitarlo"
            value={selectedAdultoSearch}
            onChange={(event) => setSelectedAdultoSearch(event.target.value)}
          />
        </label>

        <div className="alimentacion-batch-table-wrap">
          <table className="alimentacion-batch-table">
            <thead>
              <tr>
                <th scope="col">Cédula</th>
                <th scope="col">Nombre</th>
                <th scope="col">Refrigerio 1</th>
                <th scope="col">Almuerzo</th>
                <th scope="col">Refrigerio 2</th>
                <th scope="col">Auxilio Transporte</th>
                <th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody>
              {selectedRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>Aun no has agregado adultos mayores al lote.</td>
                </tr>
              ) : filteredSelectedRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    No hay adultos mayores agregados que coincidan con la busqueda.
                  </td>
                </tr>
              ) : (
                filteredSelectedRows.map((row) => (
                  <tr key={row.adultoMayor.id}>
                    <td>{row.adultoMayor.documentNumber}</td>
                    <td>
                      <strong>{row.adultoMayor.fullName}</strong>
                    </td>
                    <td>
                      <select
                        aria-label={`Refrigerio 1 de ${row.adultoMayor.fullName}`}
                        value={row.refrigerio1}
                        onChange={(event) =>
                          updateStatus(
                            row.adultoMayor.id,
                            "refrigerio1",
                            event.target.value as AlimentacionStatus | "",
                          )
                        }
                      >
                        <option value="">Seleccione...</option>
                        {getAlimentacionStatusOptions().map((option) => (
                          <option key={option} value={option}>
                            {formatAlimentacionStatus(option)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label={`Almuerzo de ${row.adultoMayor.fullName}`}
                        value={row.almuerzo}
                        onChange={(event) =>
                          updateStatus(
                            row.adultoMayor.id,
                            "almuerzo",
                            event.target.value as AlimentacionStatus | "",
                          )
                        }
                      >
                        <option value="">Seleccione...</option>
                        {getAlimentacionStatusOptions().map((option) => (
                          <option key={option} value={option}>
                            {formatAlimentacionStatus(option)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label={`Refrigerio 2 de ${row.adultoMayor.fullName}`}
                        value={row.refrigerio2}
                        onChange={(event) =>
                          updateStatus(
                            row.adultoMayor.id,
                            "refrigerio2",
                            event.target.value as AlimentacionStatus | "",
                          )
                        }
                      >
                        <option value="">Seleccione...</option>
                        {getAlimentacionStatusOptions().map((option) => (
                          <option key={option} value={option}>
                            {formatAlimentacionStatus(option)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label={`Auxilio de transporte de ${row.adultoMayor.fullName}`}
                        value={row.auxilioTransporte}
                        onChange={(event) =>
                          updateStatus(
                            row.adultoMayor.id,
                            "auxilioTransporte",
                            event.target.value as AlimentacionStatus | "",
                          )
                        }
                      >
                        <option value="">Seleccione...</option>
                        {getAlimentacionStatusOptions().map((option) => (
                          <option key={option} value={option}>
                            {formatAlimentacionStatus(option)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="alimentacion-batch-row-actions">
                        <button
                          className="alimentacion-row-action alimentacion-row-action--success"
                          type="button"
                          aria-label={`Marcar entregado ${row.adultoMayor.fullName}`}
                          title="Marcar entregado"
                          onClick={() => markAdultoMayorAsDelivered(row.adultoMayor.id)}
                        >
                          <Check aria-hidden="true" />
                        </button>
                        <button
                          className="alimentacion-row-action alimentacion-row-action--reset"
                          type="button"
                          aria-label={`Desmarcar ${row.adultoMayor.fullName}`}
                          title="Desmarcar"
                          onClick={() => clearAdultoMayorStatuses(row.adultoMayor.id)}
                        >
                          <Eraser aria-hidden="true" />
                        </button>
                        <button
                          className="alimentacion-row-action alimentacion-row-action--danger"
                          type="button"
                          aria-label={`Eliminar ${row.adultoMayor.fullName}`}
                          title="Eliminar"
                          onClick={() => removeAdultoMayor(row.adultoMayor.id)}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {error !== null ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="alimentacion-form-actions">
        <button className="outline-action" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary-action" type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
