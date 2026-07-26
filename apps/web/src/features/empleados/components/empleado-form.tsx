import {
  type AuthUser,
  type EmpleadoDetail,
  type EmpleadoTenantOption,
  type CreateEmpleadoRequest,
  type UpdateEmpleadoRequest,
} from "@cuidarte/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Power } from "lucide-react";
import { type FieldErrors, type Resolver, useForm } from "react-hook-form";
import { useEffect } from "react";

import {
  type EmpleadoFormValues,
  createDefaultEmpleadoFormValues,
  empleadoFormSchema,
  toCreateEmpleadoRequest,
  toEmpleadoFormValues,
  toUpdateEmpleadoRequest,
} from "../schemas/empleado-form.schema";
import { formatEmpleadoRole, getAssignableEmpleadoRoles } from "../lib/empleados-formatters";
import { EmpleadoFieldGroup } from "./empleado-field-group";

type EmpleadoFormProps =
  | {
      mode: "create";
      areTenantOptionsLoading: boolean;
      currentUserRole: AuthUser["role"];
      error: string | null;
      isPending: boolean;
      shouldSelectTenant: boolean;
      tenantOptions: EmpleadoTenantOption[];
      onCancel: () => void;
      onSubmit: (values: CreateEmpleadoRequest) => void;
    }
  | {
      mode: "edit";
      currentUserRole: AuthUser["role"];
      detail: EmpleadoDetail;
      error: string | null;
      isPending: boolean;
      onCancel: () => void;
      onSubmit: (values: UpdateEmpleadoRequest) => void;
    };

export function EmpleadoForm(props: EmpleadoFormProps) {
  const detail = props.mode === "edit" ? props.detail : null;
  const form = useForm<EmpleadoFormValues>({
    resolver: zodResolver(empleadoFormSchema) as Resolver<EmpleadoFormValues>,
    defaultValues:
      props.mode === "edit" ? toEmpleadoFormValues(props.detail) : createDefaultEmpleadoFormValues(),
    mode: "onBlur",
  });
  const { reset, setError, setValue, watch } = form;
  const selectedRole = watch("role");
  const isActive = watch("isActive");
  const roleOptions = getAssignableEmpleadoRoles(props.currentUserRole);
  const shouldShowTenantSelect =
    props.mode === "create" && props.shouldSelectTenant && selectedRole !== "super_admin";

  useEffect(() => {
    if (detail !== null) {
      reset(toEmpleadoFormValues(detail));
    }
  }, [detail, reset]);

  function getError(field: keyof EmpleadoFormValues): string | undefined {
    const message = form.formState.errors[field]?.message;

    return typeof message === "string" ? message : undefined;
  }

  function handleInvalidSubmit(_errors: FieldErrors<EmpleadoFormValues>) {
    return;
  }

  return (
    <form
      className="empleado-form"
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          if (props.mode === "create") {
            if (shouldShowTenantSelect && values.tenantId.trim() === "") {
              setError("tenantId", {
                type: "manual",
                message: "Selecciona un centro.",
              });
              return;
            }

            if (values.password.trim().length < 8) {
              setError("password", {
                type: "manual",
                message: "La contrasena debe tener minimo 8 caracteres.",
              });
              return;
            }

            props.onSubmit(toCreateEmpleadoRequest(values));
            return;
          }

          if (values.password.trim() !== "" && values.password.trim().length < 8) {
            setError("password", {
              type: "manual",
              message: "La nueva contrasena debe tener minimo 8 caracteres.",
            });
            return;
          }

          props.onSubmit(toUpdateEmpleadoRequest(values));
        }, handleInvalidSubmit)(event);
      }}
    >
      <section className="empleado-form-panel">
        <div
          className={`empleado-form-grid${
            shouldShowTenantSelect ? " empleado-form-grid--with-tenant" : ""
          }`}
        >
          {shouldShowTenantSelect ? (
            <EmpleadoFieldGroup
              className="empleado-form-field--tenant"
              label="Centro"
              error={getError("tenantId")}
            >
              <select
                aria-invalid={getError("tenantId") === undefined ? "false" : "true"}
                disabled={props.mode === "create" && props.areTenantOptionsLoading}
                {...form.register("tenantId")}
              >
                <option value="">Seleccionar</option>
                {props.mode === "create"
                  ? props.tenantOptions.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))
                  : null}
              </select>
            </EmpleadoFieldGroup>
          ) : null}

          <EmpleadoFieldGroup
            className="empleado-form-field--name"
            label="Primer nombre"
            error={getError("firstName")}
          >
            <input
              type="text"
              autoComplete="given-name"
              aria-invalid={getError("firstName") === undefined ? "false" : "true"}
              {...form.register("firstName")}
            />
          </EmpleadoFieldGroup>

          <EmpleadoFieldGroup
            className="empleado-form-field--name"
            label="Segundo nombre"
            error={getError("middleName")}
          >
            <input
              type="text"
              autoComplete="additional-name"
              aria-invalid={getError("middleName") === undefined ? "false" : "true"}
              {...form.register("middleName")}
            />
          </EmpleadoFieldGroup>

          <EmpleadoFieldGroup
            className="empleado-form-field--name"
            label="Primer apellido"
            error={getError("firstSurname")}
          >
            <input
              type="text"
              autoComplete="family-name"
              aria-invalid={getError("firstSurname") === undefined ? "false" : "true"}
              {...form.register("firstSurname")}
            />
          </EmpleadoFieldGroup>

          <EmpleadoFieldGroup
            className="empleado-form-field--name"
            label="Segundo apellido"
            error={getError("secondSurname")}
          >
            <input
              type="text"
              aria-invalid={getError("secondSurname") === undefined ? "false" : "true"}
              {...form.register("secondSurname")}
            />
          </EmpleadoFieldGroup>

          <EmpleadoFieldGroup
            className="empleado-form-field--email"
            label="Correo electronico"
            error={getError("email")}
          >
            <input
              type="email"
              autoComplete="email"
              aria-invalid={getError("email") === undefined ? "false" : "true"}
              {...form.register("email")}
            />
          </EmpleadoFieldGroup>

          <EmpleadoFieldGroup
            className="empleado-form-field--compact"
            label="Numero de documento"
            error={getError("documentNumber")}
          >
            <input
              type="text"
              inputMode="text"
              aria-invalid={getError("documentNumber") === undefined ? "false" : "true"}
              {...form.register("documentNumber")}
            />
          </EmpleadoFieldGroup>

          <EmpleadoFieldGroup
            className="empleado-form-field--compact"
            label="Telefono"
            error={getError("phone")}
          >
            <input
              type="tel"
              autoComplete="tel"
              aria-invalid={getError("phone") === undefined ? "false" : "true"}
              {...form.register("phone")}
            />
          </EmpleadoFieldGroup>

          <EmpleadoFieldGroup
            className="empleado-form-field--compact"
            label="Tipo de usuario"
            error={getError("role")}
          >
            <select
              aria-invalid={getError("role") === undefined ? "false" : "true"}
              {...form.register("role")}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {formatEmpleadoRole(role)}
                </option>
              ))}
            </select>
          </EmpleadoFieldGroup>

          <EmpleadoFieldGroup
            className="empleado-form-field--compact"
            label={props.mode === "create" ? "Contrasena" : "Nueva contrasena"}
            error={getError("password")}
          >
            <input
              type="password"
              autoComplete={props.mode === "create" ? "new-password" : "off"}
              aria-invalid={getError("password") === undefined ? "false" : "true"}
              {...form.register("password")}
            />
          </EmpleadoFieldGroup>
        </div>
      </section>

      {props.error !== null ? (
        <p className="form-error" role="alert">
          {props.error}
        </p>
      ) : null}

      <div className="empleado-form-footer">
        <button
          className="empleado-status-toggle"
          type="button"
          aria-pressed={isActive}
          onClick={() =>
            setValue("isActive", !isActive, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
        >
          <span className="empleado-status-toggle__icon" aria-hidden="true">
            <Power />
          </span>
          <span>
            <strong>{isActive ? "Usuario activo" : "Usuario inactivo"}</strong>
            <small>{isActive ? "Inactivar usuario" : "Activar usuario"}</small>
          </span>
        </button>

        <div className="empleado-form-actions">
          <button className="outline-action" type="button" onClick={props.onCancel}>
            Cancelar
          </button>
          <button className="primary-action" type="submit" disabled={props.isPending}>
            {props.isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </form>
  );
}
