import {
  type ActividadGrupalFormOptionsResponse,
  type ActividadGrupalTenantOption,
  type CreateActividadGrupalRequest,
} from "@cuidarte/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Sparkles } from "lucide-react";
import { type FieldErrors, type Resolver, useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";

import { formatEmpleadoRole } from "@/features/empleados/lib/empleados-formatters";

import {
  formatActividadGrupalOrganizer,
  formatActividadGrupalType,
  formatActaNumber,
  getActividadGrupalOrganizerOptions,
  getActividadGrupalTypeOptions,
} from "../lib/actividades-grupales-formatters";
import {
  type ActividadGrupalFormValues,
  actividadGrupalFormSchema,
  createDefaultActividadGrupalFormValues,
  toCreateActividadGrupalRequest,
} from "../schemas/actividad-grupal-form.schema";
import { ActividadGrupalFieldGroup } from "./actividad-grupal-field-group";

type ActividadGrupalFormProps = {
  error: string | null;
  formOptions: ActividadGrupalFormOptionsResponse | null;
  isFormOptionsLoading: boolean;
  isPending: boolean;
  isTenantOptionsLoading: boolean;
  selectedTenantId: string;
  shouldSelectTenant: boolean;
  tenantOptions: ActividadGrupalTenantOption[];
  onCancel: () => void;
  onSubmit: (values: CreateActividadGrupalRequest) => void;
  onTenantChange: (tenantId: string) => void;
};

export function ActividadGrupalForm({
  error,
  formOptions,
  isFormOptionsLoading,
  isPending,
  isTenantOptionsLoading,
  onCancel,
  onSubmit,
  onTenantChange,
  selectedTenantId,
  shouldSelectTenant,
  tenantOptions,
}: ActividadGrupalFormProps) {
  const [employeeSearch, setEmployeeSearch] = useState("");
  const form = useForm<ActividadGrupalFormValues>({
    resolver: zodResolver(actividadGrupalFormSchema) as Resolver<ActividadGrupalFormValues>,
    defaultValues: createDefaultActividadGrupalFormValues(),
    mode: "onBlur",
  });
  const { getValues, resetField, setError, setValue, watch } = form;
  const employeeIds = watch("employeeIds");
  const isTenantSelected = !shouldSelectTenant || selectedTenantId.trim() !== "";
  const availableEmployees = formOptions?.empleados ?? [];
  const filteredEmployees = useMemo(() => {
    const search = employeeSearch.trim().toLowerCase();

    if (search === "") {
      return availableEmployees;
    }

    return availableEmployees.filter((empleado) =>
      [empleado.fullName, formatEmpleadoRole(empleado.role)].some((value) =>
        value.toLowerCase().includes(search),
      ),
    );
  }, [availableEmployees, employeeSearch]);

  useEffect(() => {
    setValue("tenantId", selectedTenantId, { shouldDirty: false });
  }, [selectedTenantId, setValue]);

  useEffect(() => {
    const availableIds = new Set(availableEmployees.map((empleado) => empleado.id));
    const nextEmployeeIds = getValues("employeeIds").filter((employeeId) =>
      availableIds.has(employeeId),
    );

    if (nextEmployeeIds.length !== getValues("employeeIds").length) {
      setValue("employeeIds", nextEmployeeIds, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  }, [availableEmployees, getValues, setValue]);

  function getError(field: keyof ActividadGrupalFormValues): string | undefined {
    const message = form.formState.errors[field]?.message;

    return typeof message === "string" ? message : undefined;
  }

  function toggleEmployee(employeeId: string) {
    const currentValue = getValues("employeeIds");
    const nextValue = currentValue.includes(employeeId)
      ? currentValue.filter((id) => id !== employeeId)
      : [...currentValue, employeeId];

    setValue("employeeIds", nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function handleInvalidSubmit(_errors: FieldErrors<ActividadGrupalFormValues>) {
    return;
  }

  return (
    <form
      className="actividad-form"
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

          if (!isTenantSelected) {
            return;
          }

          onSubmit(toCreateActividadGrupalRequest(values));
        }, handleInvalidSubmit)(event);
      }}
    >
      <section className="actividad-form-shell">
        <aside className="actividad-form-summary">
          <div className="actividad-form-summary__acta">
            <span className="eyebrow">Consecutivo</span>
            <strong>
              {isTenantSelected && formOptions !== null
                ? formatActaNumber(formOptions.nextActaNumber)
                : "----"}
            </strong>
            <small>
              {isTenantSelected
                ? "Se asigna automaticamente al guardar."
                : "Selecciona un centro para generar el acta."}
            </small>
          </div>

          <div className="actividad-form-summary__note">
            <Sparkles aria-hidden="true" />
            <p>
              Registra la actividad y define de una vez el equipo involucrado para dejar el acta
              lista sin volver a recorrer el modulo.
            </p>
          </div>
        </aside>

        <section className="actividad-form-panel">
          <div className="actividad-form-grid">
            {shouldSelectTenant ? (
              <ActividadGrupalFieldGroup label="Centro" error={getError("tenantId")}>
                <select
                  aria-invalid={getError("tenantId") === undefined ? "false" : "true"}
                  disabled={isTenantOptionsLoading}
                  {...form.register("tenantId", {
                    onChange: (event) => {
                      const nextTenantId = String(event.target.value);

                      onTenantChange(nextTenantId);
                      resetField("employeeIds", { defaultValue: [] });
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
              </ActividadGrupalFieldGroup>
            ) : null}

            <ActividadGrupalFieldGroup
              label="Numero de acta"
              hint={isFormOptionsLoading ? "Cargando consecutivo..." : "Solo lectura"}
            >
              <input
                type="text"
                value={
                  isTenantSelected && formOptions !== null
                    ? formatActaNumber(formOptions.nextActaNumber)
                    : ""
                }
                placeholder="Automatico"
                disabled
                readOnly
              />
            </ActividadGrupalFieldGroup>

            <ActividadGrupalFieldGroup
              label="Nombre de la actividad"
              error={getError("activityName")}
            >
              <input
                type="text"
                aria-invalid={getError("activityName") === undefined ? "false" : "true"}
                {...form.register("activityName")}
              />
            </ActividadGrupalFieldGroup>

            <ActividadGrupalFieldGroup label="Tipo de actividad" error={getError("activityType")}>
              <select
                aria-invalid={getError("activityType") === undefined ? "false" : "true"}
                {...form.register("activityType")}
              >
                {getActividadGrupalTypeOptions().map((option) => (
                  <option key={option} value={option}>
                    {formatActividadGrupalType(option)}
                  </option>
                ))}
              </select>
            </ActividadGrupalFieldGroup>

            <ActividadGrupalFieldGroup
              label="Fecha de la actividad"
              error={getError("activityDate")}
            >
              <input
                type="date"
                aria-invalid={getError("activityDate") === undefined ? "false" : "true"}
                {...form.register("activityDate")}
              />
            </ActividadGrupalFieldGroup>

            <ActividadGrupalFieldGroup label="Hora de inicio" error={getError("startTime")}>
              <input
                type="time"
                aria-invalid={getError("startTime") === undefined ? "false" : "true"}
                {...form.register("startTime")}
              />
            </ActividadGrupalFieldGroup>

            <ActividadGrupalFieldGroup label="Hora final" error={getError("endTime")}>
              <input
                type="time"
                aria-invalid={getError("endTime") === undefined ? "false" : "true"}
                {...form.register("endTime")}
              />
            </ActividadGrupalFieldGroup>

            <ActividadGrupalFieldGroup label="Organizador" error={getError("organizer")}>
              <select
                aria-invalid={getError("organizer") === undefined ? "false" : "true"}
                {...form.register("organizer")}
              >
                {getActividadGrupalOrganizerOptions().map((option) => (
                  <option key={option} value={option}>
                    {formatActividadGrupalOrganizer(option)}
                  </option>
                ))}
              </select>
            </ActividadGrupalFieldGroup>
          </div>
        </section>
      </section>

      <section className="actividad-form-panel actividad-form-panel--empleados">
        <div className="actividad-form-panel__header">
          <div>
            <p className="eyebrow">Equipo involucrado</p>
            <h2>Selecciona los empleados</h2>
          </div>
          <span>{employeeIds.length} seleccionados</span>
        </div>

        <label className="actividad-empleados-search">
          <Search aria-hidden="true" />
          <input
            value={employeeSearch}
            placeholder="Buscar por nombre o rol"
            disabled={!isTenantSelected}
            onChange={(event) => setEmployeeSearch(event.target.value)}
          />
        </label>

        {!isTenantSelected ? (
          <div className="actividad-empleados-empty">
            <p>Selecciona un centro para cargar los empleados activos.</p>
          </div>
        ) : isFormOptionsLoading ? (
          <div className="actividad-empleados-empty">
            <p>Cargando empleados activos...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="actividad-empleados-empty">
            <p>No hay empleados que coincidan con la busqueda.</p>
          </div>
        ) : (
          <div className="actividad-empleados-list">
            {filteredEmployees.map((empleado) => {
              const isChecked = employeeIds.includes(empleado.id);

              return (
                <label
                  key={empleado.id}
                  className={
                    isChecked
                      ? "actividad-empleado-option actividad-empleado-option--checked"
                      : "actividad-empleado-option"
                  }
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleEmployee(empleado.id)}
                  />
                  <span>
                    <strong>{empleado.fullName}</strong>
                    <small>{formatEmpleadoRole(empleado.role)}</small>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {getError("employeeIds") !== undefined ? (
          <p className="form-error" role="alert">
            {getError("employeeIds")}
          </p>
        ) : null}
      </section>

      {error !== null ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="actividad-form-actions">
        <button className="outline-action" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary-action" type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar actividad"}
        </button>
      </div>
    </form>
  );
}
