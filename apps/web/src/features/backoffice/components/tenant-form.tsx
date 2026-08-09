import {
  type BackofficeTenantDetail,
  type CreateBackofficeTenantRequest,
  type UpdateBackofficeTenantRequest,
  createBackofficeTenantRequestSchema,
  updateBackofficeTenantRequestSchema,
} from "@cuidarte/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Controller, type Resolver, useForm, useWatch } from "react-hook-form";
import { useEffect, useId, useRef, useState } from "react";

import {
  type BackofficeTenantFormValues,
  createBackofficeTenantFormSchema,
  createDefaultFormValues,
  toFormValues,
  updateBackofficeTenantFormSchema,
} from "../schemas/tenant-form.schema";
import { FieldGroup } from "./field-group";
import { SearchableCombobox } from "@/shared/components/searchable-combobox";
import {
  findLocationOptionByName,
  getLocationOptionLabel,
} from "../../ubicaciones/lib/location-options";
import {
  useDepartmentsQuery,
  useMunicipalitiesQuery,
} from "../../ubicaciones/model/ubicaciones-queries";

type BackofficeTenantFormProps =
  | {
      mode: "create";
      isPending: boolean;
      error: string | null;
      onSubmit: (values: CreateBackofficeTenantRequest) => void;
    }
  | {
      mode: "edit";
      detail: BackofficeTenantDetail;
      isPending: boolean;
      error: string | null;
      onSubmit: (values: UpdateBackofficeTenantRequest) => void;
    };

export function BackofficeTenantForm(props: BackofficeTenantFormProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const passwordHintId = useId();
  const detail = props.mode === "edit" ? props.detail : null;
  const schema =
    props.mode === "create"
      ? createBackofficeTenantFormSchema
      : updateBackofficeTenantFormSchema;
  const form = useForm<BackofficeTenantFormValues>({
    resolver: zodResolver(schema) as Resolver<BackofficeTenantFormValues>,
    defaultValues: props.mode === "edit" ? toFormValues(props.detail) : createDefaultFormValues(),
    mode: "onBlur",
  });
  const { reset } = form;
  const departmentId =
    useWatch({
      control: form.control,
      name: "tenant.departmentId",
    }) ?? "";
  const municipalityId =
    useWatch({
      control: form.control,
      name: "tenant.municipalityId",
    }) ?? "";
  const departmentsQuery = useDepartmentsQuery();
  const municipalitiesQuery = useMunicipalitiesQuery(
    departmentId,
    departmentId.trim() !== "",
  );
  const departmentOptions = departmentsQuery.data?.departments ?? [];
  const municipalityOptions = municipalitiesQuery.data?.municipalities ?? [];
  const hasAppliedDepartmentFallback = useRef(false);
  const hasAppliedMunicipalityFallback = useRef(false);

  useEffect(() => {
    if (detail !== null) {
      hasAppliedDepartmentFallback.current = false;
      hasAppliedMunicipalityFallback.current = false;
      reset(toFormValues(detail));
    }
  }, [detail, reset]);

  useEffect(() => {
    if (
      detail === null ||
      departmentId.trim() !== "" ||
      departmentsQuery.data === undefined ||
      hasAppliedDepartmentFallback.current
    ) {
      return;
    }

    const fallbackDepartment = findLocationOptionByName(
      departmentOptions,
      detail.tenant.department,
    );

    if (fallbackDepartment === null) {
      return;
    }

    hasAppliedDepartmentFallback.current = true;
    form.setValue("tenant.departmentId", fallbackDepartment.id, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [departmentId, departmentsQuery.data, departmentOptions, detail, form]);

  useEffect(() => {
    if (
      detail === null ||
      departmentId.trim() === "" ||
      municipalityId.trim() !== "" ||
      municipalitiesQuery.data === undefined ||
      hasAppliedMunicipalityFallback.current
    ) {
      return;
    }

    const fallbackMunicipality = findLocationOptionByName(
      municipalityOptions,
      detail.tenant.city,
    );

    if (fallbackMunicipality === null) {
      return;
    }

    hasAppliedMunicipalityFallback.current = true;
    form.setValue("tenant.municipalityId", fallbackMunicipality.id, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [
    departmentId,
    detail,
    form,
    municipalitiesQuery.data,
    municipalityId,
    municipalityOptions,
  ]);

  return (
    <form
      className="backoffice-form"
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          if (props.mode === "create") {
            props.onSubmit(createBackofficeTenantRequestSchema.parse(values));
            return;
          }

          props.onSubmit(updateBackofficeTenantRequestSchema.parse(values));
        })(event);
      }}
    >
      <section className="form-panel form-panel--tenant" aria-labelledby="tenant-form-title">
        <div className="form-panel__header">
          <p className="eyebrow">Tenant</p>
          <h2 id="tenant-form-title">Datos del centro</h2>
        </div>

        <div className="form-grid">
          <FieldGroup label="Nombre del centro" error={form.formState.errors.tenant?.name?.message}>
            <input
              type="text"
              autoComplete="organization"
              aria-invalid={form.formState.errors.tenant?.name === undefined ? "false" : "true"}
              {...form.register("tenant.name")}
            />
          </FieldGroup>

          <FieldGroup
            label="Tipo de documento"
            error={form.formState.errors.tenant?.documentType?.message}
          >
            <select
              aria-invalid={
                form.formState.errors.tenant?.documentType === undefined ? "false" : "true"
              }
              {...form.register("tenant.documentType")}
            >
              <option value="nit">NIT</option>
              <option value="cc">CC</option>
              <option value="ce">CE</option>
            </select>
          </FieldGroup>

          <FieldGroup
            label="Número de documento"
            error={form.formState.errors.tenant?.documentNumber?.message}
          >
            <input
              type="text"
              inputMode="text"
              aria-invalid={
                form.formState.errors.tenant?.documentNumber === undefined ? "false" : "true"
              }
              {...form.register("tenant.documentNumber")}
            />
          </FieldGroup>

          <FieldGroup
            label="Correo del centro"
            error={form.formState.errors.tenant?.email?.message}
          >
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-invalid={form.formState.errors.tenant?.email === undefined ? "false" : "true"}
              {...form.register("tenant.email")}
            />
          </FieldGroup>

          <FieldGroup label="Teléfono" error={form.formState.errors.tenant?.phone?.message}>
            <input
              type="tel"
              autoComplete="tel"
              aria-invalid={form.formState.errors.tenant?.phone === undefined ? "false" : "true"}
              {...form.register("tenant.phone")}
            />
          </FieldGroup>

          <FieldGroup label="Dirección" error={form.formState.errors.tenant?.address?.message}>
            <input
              type="text"
              autoComplete="street-address"
              aria-invalid={form.formState.errors.tenant?.address === undefined ? "false" : "true"}
              {...form.register("tenant.address")}
            />
          </FieldGroup>

          <FieldGroup
            label="Departamento"
            error={form.formState.errors.tenant?.departmentId?.message}
          >
            <Controller
              control={form.control}
              name="tenant.departmentId"
              render={({ field }) => (
                <SearchableCombobox
                  ariaInvalid={form.formState.errors.tenant?.departmentId !== undefined}
                  ariaLabel="Departamento"
                  getOptionLabel={getLocationOptionLabel}
                  isLoading={departmentsQuery.isLoading}
                  onBlur={field.onBlur}
                  onValueChange={(nextDepartmentId) => {
                    const departmentChanged = nextDepartmentId !== field.value;

                    field.onChange(nextDepartmentId);

                    if (!departmentChanged) {
                      return;
                    }

                    hasAppliedDepartmentFallback.current = true;
                    form.setValue("tenant.municipalityId", "", {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                    hasAppliedMunicipalityFallback.current = true;
                  }}
                  options={departmentOptions}
                  value={field.value ?? ""}
                />
              )}
            />
          </FieldGroup>

          <FieldGroup
            label="Municipio"
            error={form.formState.errors.tenant?.municipalityId?.message}
          >
            <Controller
              control={form.control}
              name="tenant.municipalityId"
              render={({ field }) => (
                <SearchableCombobox
                  ariaInvalid={form.formState.errors.tenant?.municipalityId !== undefined}
                  ariaLabel="Municipio"
                  disabled={departmentId.trim() === ""}
                  getOptionLabel={getLocationOptionLabel}
                  isLoading={municipalitiesQuery.isLoading}
                  onBlur={field.onBlur}
                  onValueChange={(nextMunicipalityId) => {
                    if (nextMunicipalityId !== field.value) {
                      hasAppliedMunicipalityFallback.current = true;
                    }

                    field.onChange(nextMunicipalityId);
                  }}
                  options={municipalityOptions}
                  placeholder={
                    departmentId.trim() === "" ? "Selecciona primero un departamento" : undefined
                  }
                  value={field.value ?? ""}
                />
              )}
            />
          </FieldGroup>
        </div>

        <label className="switch-field">
          <input type="checkbox" {...form.register("tenant.isActive")} />
          <span>Tenant activo</span>
        </label>
      </section>

      <section className="form-panel form-panel--owner" aria-labelledby="owner-form-title">
        <div className="form-panel__header">
          <p className="eyebrow">Propietario</p>
          <h2 id="owner-form-title">Usuario administrador</h2>
        </div>

        <div className="form-grid">
          <FieldGroup
            label="Nombre completo"
            error={form.formState.errors.owner?.fullName?.message}
          >
            <input
              type="text"
              autoComplete="name"
              aria-invalid={form.formState.errors.owner?.fullName === undefined ? "false" : "true"}
              {...form.register("owner.fullName")}
            />
          </FieldGroup>

          <FieldGroup label="Correo de acceso" error={form.formState.errors.owner?.email?.message}>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-invalid={form.formState.errors.owner?.email === undefined ? "false" : "true"}
              {...form.register("owner.email")}
            />
          </FieldGroup>

          <FieldGroup
            label={props.mode === "create" ? "Contraseña inicial" : "Nueva contraseña"}
            error={form.formState.errors.owner?.password?.message}
          >
            <div className="password-field">
              <input
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="new-password"
                aria-describedby={props.mode === "edit" ? passwordHintId : undefined}
                aria-invalid={
                  form.formState.errors.owner?.password === undefined ? "false" : "true"
                }
                {...form.register("owner.password")}
              />
              <button
                className="password-visibility"
                type="button"
                aria-label={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={isPasswordVisible}
                onClick={() => {
                  setIsPasswordVisible((currentValue) => !currentValue);
                }}
              >
                {isPasswordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
            {props.mode === "edit" ? (
              <span className="field-hint" id={passwordHintId}>
                Déjala vacía para conservar la actual.
              </span>
            ) : null}
          </FieldGroup>
        </div>

        <label className="switch-field">
          <input type="checkbox" {...form.register("owner.isActive")} />
          <span>Propietario activo</span>
        </label>
      </section>

      {props.error !== null ? (
        <p className="form-error" role="alert">
          {props.error}
        </p>
      ) : null}

      <div className="form-actions">
        <button className="primary-action" disabled={props.isPending} type="submit">
          {props.isPending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}
