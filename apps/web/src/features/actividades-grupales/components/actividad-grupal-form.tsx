import {
  type ActividadGrupalFormOptionsResponse,
  type ActividadGrupalTipoSummary,
  type ActividadGrupalTenantOption,
  type AuthUser,
} from "@cuidarte/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Search, Sparkles, X } from "lucide-react";
import { type FieldErrors, type Resolver, useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { formatEmpleadoRole } from "@/features/empleados/lib/empleados-formatters";

import {
  formatActividadGrupalOrganizer,
  getCreatableActividadGrupalOrganizerOptions,
  getActividadGrupalOrganizerOptions,
} from "../lib/actividades-grupales-formatters";
import {
  type ActividadGrupalFormValues,
  actividadGrupalFormSchema,
  createDefaultActividadGrupalFormValues,
} from "../schemas/actividad-grupal-form.schema";
import { ActividadGrupalFieldGroup } from "./actividad-grupal-field-group";

type ActividadGrupalFormProps = {
  user: AuthUser;
  mode: "create" | "edit";
  error: string | null;
  formOptions: ActividadGrupalFormOptionsResponse | null;
  initialValues?: ActividadGrupalFormValues;
  currentActivityType?: ActividadGrupalTipoSummary | null;
  isFormOptionsLoading: boolean;
  isPending: boolean;
  isTenantOptionsLoading: boolean;
  selectedTenantId: string;
  shouldSelectTenant: boolean;
  tenantOptions: ActividadGrupalTenantOption[];
  onCancel: () => void;
  onSubmit: (values: ActividadGrupalFormValues) => void;
  onTenantChange: (tenantId: string) => void;
};

const EXCLUDED_SESSION_EMPLOYEE_ROLES: ReadonlySet<string> = new Set(["admin", "auditor"]);
const ALL_EMPLOYEES_ANIMATION_TARGET = "__all__";

export function ActividadGrupalForm({
  user,
  mode,
  error,
  formOptions,
  initialValues,
  currentActivityType = null,
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
  const [employeeSelectionAnimation, setEmployeeSelectionAnimation] = useState<{
    employeeId: string;
    sequence: number;
  } | null>(null);
  const form = useForm<ActividadGrupalFormValues>({
    resolver: zodResolver(actividadGrupalFormSchema) as Resolver<ActividadGrupalFormValues>,
    defaultValues: initialValues ?? createDefaultActividadGrupalFormValues(),
    mode: "onBlur",
  });
  const { getValues, reset, resetField, setError, setValue, watch } = form;
  const employeeIds = watch("employeeIds");
  const organizerValue = watch("organizer");
  const isTenantSelected = !shouldSelectTenant || selectedTenantId.trim() !== "";
  const availableEmployees = useMemo(
    () =>
      (formOptions?.empleados ?? []).filter(
        (employee) => !EXCLUDED_SESSION_EMPLOYEE_ROLES.has(employee.role),
      ),
    [formOptions?.empleados],
  );
  const activityTypeOptions = useMemo(() => {
    const options = [...(formOptions?.activityTypes ?? [])];

    if (
      currentActivityType !== null &&
      !options.some((option) => option.id === currentActivityType.id)
    ) {
      options.push({
        ...currentActivityType,
        tenantId: selectedTenantId,
        normalizedName: currentActivityType.name.toLowerCase(),
        consecutiveConfig: null,
        createdAt: "",
        updatedAt: "",
        deactivatedAt: null,
      });
    }

    return options;
  }, [currentActivityType, formOptions?.activityTypes, selectedTenantId]);
  const organizerOptions = useMemo(
    () =>
      mode === "create"
        ? getCreatableActividadGrupalOrganizerOptions(user)
        : getActividadGrupalOrganizerOptions(),
    [mode, user],
  );
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
    if (initialValues !== undefined) {
      reset(initialValues);
    }
  }, [
    initialValues?.tenantId,
    initialValues?.activityName,
    initialValues?.activityTypeId,
    initialValues?.activityDate,
    initialValues?.startTime,
    initialValues?.endTime,
    initialValues?.organizer,
    initialValues?.employeeIds,
    reset,
  ]);

  useEffect(() => {
    setValue("tenantId", selectedTenantId, { shouldDirty: false });
  }, [selectedTenantId, setValue]);

  useEffect(() => {
    if (mode !== "create" || organizerOptions.includes(organizerValue)) {
      return;
    }

    setValue("organizer", organizerOptions[0] ?? "director", { shouldDirty: false });
  }, [mode, organizerOptions, organizerValue, setValue]);

  useEffect(() => {
    if (!isTenantSelected || isFormOptionsLoading || formOptions === null) {
      return;
    }

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
  }, [
    availableEmployees,
    formOptions,
    getValues,
    isFormOptionsLoading,
    isTenantSelected,
    setValue,
  ]);

  function getError(field: keyof ActividadGrupalFormValues): string | undefined {
    const message = form.formState.errors[field]?.message;

    return typeof message === "string" ? message : undefined;
  }

  function toggleEmployee(employeeId: string) {
    setEmployeeSelectionAnimation((current) => ({
      employeeId,
      sequence: (current?.sequence ?? 0) + 1,
    }));
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

  function selectAllEmployees() {
    setEmployeeSelectionAnimation((current) => ({
      employeeId: ALL_EMPLOYEES_ANIMATION_TARGET,
      sequence: (current?.sequence ?? 0) + 1,
    }));
    setValue(
      "employeeIds",
      availableEmployees.map((employee) => employee.id),
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      },
    );
  }

  function handleInvalidSubmit(errors: FieldErrors<ActividadGrupalFormValues>) {
    if (errors.employeeIds !== undefined) {
      toast.error("Selecciona al menos un empleado.", { id: "actividad-empleados-required" });
    }
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

          onSubmit(values);
        }, handleInvalidSubmit)(event);
      }}
    >
      <section className="actividad-form-shell">
        <aside className="actividad-form-summary">
          <div className="actividad-form-summary__acta">
            <span className="eyebrow">Numero de acta</span>
            <strong>{mode === "create" ? "Automatico" : "Asignado"}</strong>
            <small>
              {mode === "create"
                ? "Se asignara automaticamente al guardar, segun el organizador y el centro."
                : "El consecutivo es de solo lectura. Usa la correccion administrativa si aplica."}
            </small>
          </div>

          <div className="actividad-form-summary__note">
            <Sparkles aria-hidden="true" />
            <p>
              {mode === "create"
                ? "Registra la actividad y define de una vez el equipo involucrado para dejar el acta lista sin volver a recorrer el modulo."
                : "Actualiza la informacion de la actividad y el equipo involucrado sin perder el historial del diligenciamiento."}
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
                      resetField("activityTypeId", { defaultValue: "" });
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

            <div className="actividad-form-generated-number" role="status">
              <strong>Consecutivo automatico</strong>
              <span>
                {mode === "create"
                  ? "El numero se asignara automaticamente al guardar."
                  : "El numero actual no se modifica en la edicion ordinaria."}
              </span>
            </div>

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

            <ActividadGrupalFieldGroup label="Tipo de actividad" error={getError("activityTypeId")}>
              <select
                aria-invalid={getError("activityTypeId") === undefined ? "false" : "true"}
                disabled={!isTenantSelected || isFormOptionsLoading}
                {...form.register("activityTypeId")}
              >
                <option value="">Seleccionar</option>
                {activityTypeOptions.length === 0 ? (
                  <option value="" disabled>
                    No hay tipos disponibles para tu usuario
                  </option>
                ) : (
                  activityTypeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                      {option.isActive ? "" : " (Inactiva)"}
                    </option>
                  ))
                )}
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
              {mode === "edit" ? (
                <input
                  type="hidden"
                  value={initialValues?.organizer ?? ""}
                  {...form.register("organizer")}
                />
              ) : null}
              <select
                aria-invalid={getError("organizer") === undefined ? "false" : "true"}
                aria-readonly={mode === "edit" ? "true" : "false"}
                disabled={mode === "edit"}
                value={mode === "edit" ? organizerValue : undefined}
                {...(mode === "create" ? form.register("organizer") : {})}
              >
                {organizerOptions.map((option) => (
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
          <div className="actividad-empleados-header-actions">
            <button
              className="outline-action actividad-empleados-select-all"
              type="button"
              disabled={
                !isTenantSelected ||
                isFormOptionsLoading ||
                availableEmployees.length === 0 ||
                availableEmployees.every((employee) => employeeIds.includes(employee.id))
              }
              onClick={selectAllEmployees}
            >
              Agregar todos
            </button>
            <span>{employeeIds.length} seleccionados</span>
          </div>
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
              const isAnimating =
                employeeSelectionAnimation?.employeeId === empleado.id ||
                employeeSelectionAnimation?.employeeId === ALL_EMPLOYEES_ANIMATION_TARGET;

              return (
                <label
                  key={`${empleado.id}-${isAnimating ? employeeSelectionAnimation?.sequence : 0}`}
                  className={[
                    "actividad-empleado-option",
                    isChecked ? "actividad-empleado-option--checked" : "",
                    isAnimating ? "actividad-empleado-option--just-toggled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
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
      </section>

      {error !== null ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="actividad-form-actions">
        <button
          className="outline-action actividad-form-action actividad-form-action--cancel"
          type="button"
          onClick={onCancel}
        >
          <X aria-hidden="true" />
          Cancelar
        </button>
        <button
          className="primary-action actividad-form-action actividad-form-action--save"
          type="submit"
          aria-label={mode === "create" ? "Guardar actividad" : "Guardar cambios"}
          data-tooltip="Guardar"
          disabled={isPending}
        >
          <Save aria-hidden="true" />
          {isPending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}
