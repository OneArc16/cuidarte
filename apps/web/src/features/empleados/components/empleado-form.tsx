import {
  type AuthUser,
  type EmpleadoDetail,
  type EquipoOption,
  type EmpleadoTenantOption,
  type CreateEmpleadoRequest,
  type UpdateEmpleadoRequest,
} from "@cuidarte/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { type FieldErrors, type Resolver, useForm } from "react-hook-form";
import { type ReactNode, useEffect, useState } from "react";

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
      teamOptions: EquipoOption[];
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
      sidePanel?: ReactNode;
      teamOptions: EquipoOption[];
      onCancel: () => void;
      onSubmit: (values: UpdateEmpleadoRequest) => void;
    };

export function EmpleadoForm(props: EmpleadoFormProps) {
  const detail = props.mode === "edit" ? props.detail : null;
  const sidePanel = props.mode === "edit" ? props.sidePanel : null;
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const form = useForm<EmpleadoFormValues>({
    resolver: zodResolver(empleadoFormSchema) as Resolver<EmpleadoFormValues>,
    defaultValues:
      props.mode === "edit"
        ? toEmpleadoFormValues(props.detail)
        : createDefaultEmpleadoFormValues(),
    mode: "onBlur",
  });
  const { reset, setError, setValue, watch } = form;
  const selectedRole = watch("role");
  const isActive = watch("isActive");
  const roleOptions = getAssignableEmpleadoRoles(props.currentUserRole);
  const selectedTeamId = watch("teamId");
  const teamOptions = props.teamOptions.filter(
    (team) => team.isVisible || team.id === selectedTeamId,
  );
  const shouldShowTenantSelect =
    props.mode === "create" && props.shouldSelectTenant && selectedRole !== "super_admin";
  const isDirty = form.formState.isDirty;
  const formSubtitle = detail?.fullName ?? "Completa la información para crear el nuevo empleado.";

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

  function toggleActiveUser() {
    setValue("isActive", !isActive, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
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
                message: "La contraseña debe tener mínimo 8 caracteres.",
              });
              return;
            }

            props.onSubmit(toCreateEmpleadoRequest(values));
            return;
          }

          if (values.password.trim() !== "" && values.password.trim().length < 8) {
            setError("password", {
              type: "manual",
              message: "La nueva contraseña debe tener mínimo 8 caracteres.",
            });
            return;
          }

          props.onSubmit(toUpdateEmpleadoRequest(values));
        }, handleInvalidSubmit)(event);
      }}
    >
      <header className="empleado-form-header">
        <button
          className="empleado-form-back"
          type="button"
          aria-label="Volver a la gestión de empleados"
          onClick={props.onCancel}
        >
          <ChevronLeft aria-hidden="true" />
        </button>

        <div className="empleado-form-header__copy">
          <p>{formSubtitle}</p>
        </div>

        <div className="empleado-form-header__status">
          <span>Usuario activo</span>
          <button
            className="empleado-switch"
            type="button"
            role="switch"
            aria-checked={isActive}
            aria-label={isActive ? "Inactivar usuario" : "Activar usuario"}
            onClick={toggleActiveUser}
          >
            <span aria-hidden="true" />
          </button>
        </div>
      </header>

      <div
        className={`empleado-form-layout${sidePanel == null ? "" : " empleado-form-layout--with-side"}`}
      >
        <section className="empleado-form-panel" aria-label="Datos del empleado">
          <EmpleadoFormSection title="Datos personales">
            <EmpleadoFieldGroup
              id="empleado-first-name"
              label="Primer nombre"
              error={getError("firstName")}
            >
              <input
                id="empleado-first-name"
                type="text"
                autoComplete="given-name"
                aria-invalid={getError("firstName") === undefined ? "false" : "true"}
                {...form.register("firstName")}
              />
            </EmpleadoFieldGroup>

            <EmpleadoFieldGroup
              id="empleado-middle-name"
              label="Segundo nombre"
              error={getError("middleName")}
            >
              <input
                id="empleado-middle-name"
                type="text"
                autoComplete="additional-name"
                aria-invalid={getError("middleName") === undefined ? "false" : "true"}
                {...form.register("middleName")}
              />
            </EmpleadoFieldGroup>

            <EmpleadoFieldGroup
              id="empleado-first-surname"
              label="Primer apellido"
              error={getError("firstSurname")}
            >
              <input
                id="empleado-first-surname"
                type="text"
                autoComplete="family-name"
                aria-invalid={getError("firstSurname") === undefined ? "false" : "true"}
                {...form.register("firstSurname")}
              />
            </EmpleadoFieldGroup>

            <EmpleadoFieldGroup
              id="empleado-second-surname"
              label="Segundo apellido"
              error={getError("secondSurname")}
            >
              <input
                id="empleado-second-surname"
                type="text"
                aria-invalid={getError("secondSurname") === undefined ? "false" : "true"}
                {...form.register("secondSurname")}
              />
            </EmpleadoFieldGroup>
          </EmpleadoFormSection>

          <EmpleadoFormSection title="Contacto e identificación">
            <EmpleadoFieldGroup
              className="empleado-form-field--full"
              id="empleado-email"
              label="Correo electrónico"
              error={getError("email")}
            >
              <input
                id="empleado-email"
                type="email"
                autoComplete="email"
                aria-invalid={getError("email") === undefined ? "false" : "true"}
                {...form.register("email")}
              />
            </EmpleadoFieldGroup>

            <EmpleadoFieldGroup
              id="empleado-document-number"
              label="Número de documento"
              error={getError("documentNumber")}
            >
              <input
                id="empleado-document-number"
                type="text"
                inputMode="text"
                aria-invalid={getError("documentNumber") === undefined ? "false" : "true"}
                {...form.register("documentNumber")}
              />
            </EmpleadoFieldGroup>

            <EmpleadoFieldGroup id="empleado-phone" label="Teléfono" error={getError("phone")}>
              <input
                id="empleado-phone"
                type="tel"
                autoComplete="tel"
                aria-invalid={getError("phone") === undefined ? "false" : "true"}
                {...form.register("phone")}
              />
            </EmpleadoFieldGroup>
          </EmpleadoFormSection>

          <EmpleadoFormSection title="Rol y equipo">
            {shouldShowTenantSelect ? (
              <EmpleadoFieldGroup id="empleado-tenant" label="Centro" error={getError("tenantId")}>
                <select
                  id="empleado-tenant"
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

            <EmpleadoFieldGroup id="empleado-role" label="Tipo de usuario" error={getError("role")}>
              <select
                id="empleado-role"
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
              id="empleado-team"
              label="Equipo asignado"
              error={getError("teamId")}
            >
              <select
                id="empleado-team"
                aria-invalid={getError("teamId") === undefined ? "false" : "true"}
                {...form.register("teamId")}
              >
                <option value="">Sin equipo asignado</option>
                {teamOptions.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </EmpleadoFieldGroup>
          </EmpleadoFormSection>

          <EmpleadoFormSection title="Seguridad">
            <EmpleadoFieldGroup
              className="empleado-form-field--full"
              id="empleado-password"
              label={props.mode === "create" ? "Contraseña" : "Nueva contraseña"}
              {...(props.mode === "edit" ? { hint: "Déjala vacía para conservar la actual" } : {})}
              error={getError("password")}
            >
              <div className="empleado-password-control">
                <input
                  id="empleado-password"
                  type={isPasswordVisible ? "text" : "password"}
                  autoComplete={props.mode === "create" ? "new-password" : "off"}
                  aria-invalid={getError("password") === undefined ? "false" : "true"}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  className="empleado-password-visibility"
                  aria-label={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
                >
                  {isPasswordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </EmpleadoFieldGroup>
          </EmpleadoFormSection>
        </section>

        {sidePanel}
      </div>

      {props.error !== null ? (
        <p className="form-error" role="alert" aria-live="assertive">
          {props.error}
        </p>
      ) : null}

      <footer className="empleado-form-footer">
        <p className="empleado-form-footer__dirty" aria-live="polite">
          {isDirty ? "Hay cambios sin guardar" : ""}
        </p>

        <div className="empleado-form-actions">
          <button
            className="outline-action"
            type="button"
            disabled={props.isPending}
            onClick={props.onCancel}
          >
            Cancelar
          </button>
          <button className="primary-action" type="submit" disabled={!isDirty || props.isPending}>
            {props.isPending ? (
              <span className="empleado-form-actions__spinner" aria-hidden="true" />
            ) : null}
            <span>{props.isPending ? "Guardando…" : "Guardar cambios"}</span>
          </button>
        </div>
      </footer>
    </form>
  );
}

function EmpleadoFormSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="empleado-form-section">
      <h2>{title}</h2>
      <div className="empleado-form-grid">{children}</div>
    </section>
  );
}
