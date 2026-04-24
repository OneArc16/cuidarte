import {
  type AdultoMayorDetail,
  type AdultoMayorTenantOption,
  type CreateAdultoMayorRequest,
  type UpdateAdultoMayorRequest,
} from "@cuidarte/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Resolver, type FieldErrors, useForm } from "react-hook-form";
import { useEffect, useId, useState } from "react";

import {
  type AdultoMayorFormValues,
  adultoMayorFormSchema,
  createDefaultAdultoMayorFormValues,
  toAdultoMayorFormValues,
  toCreateAdultoMayorRequest,
  toUpdateAdultoMayorRequest,
} from "../schemas/adulto-mayor-form.schema";
import { AdultoMayorFieldGroup } from "./adulto-mayor-field-group";

const FORM_SECTIONS = [
  {
    id: "personal",
    label: "Datos personales",
    fields: [
      "tenantId",
      "documentType",
      "documentNumber",
      "sex",
      "firstName",
      "middleName",
      "firstSurname",
      "secondSurname",
      "birthDate",
      "educationLevel",
      "disability",
      "populationGroup",
    ],
  },
  {
    id: "residence",
    label: "Residencia",
    fields: ["address", "department", "municipality", "zone", "country"],
  },
  {
    id: "contact",
    label: "Contacto",
    fields: [
      "phone",
      "phoneSecondary",
      "email",
      "emergencyContactFullName",
      "emergencyContactRelationship",
      "emergencyContactPhone",
      "emergencyContactAddress",
    ],
  },
  {
    id: "health",
    label: "Salud",
    fields: [
      "bloodType",
      "sisben",
      "healthRegime",
      "eps",
      "livesWithSomeone",
      "companion",
      "economicIncome",
      "socialProgramBeneficiary",
    ],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  fields: readonly (keyof AdultoMayorFormValues)[];
}>;

type AdultoMayorFormSectionId = (typeof FORM_SECTIONS)[number]["id"];

type AdultoMayorFormProps =
  | {
      mode: "create";
      areTenantOptionsLoading: boolean;
      error: string | null;
      isPending: boolean;
      shouldSelectTenant: boolean;
      tenantOptions: AdultoMayorTenantOption[];
      onCancel: () => void;
      onSubmit: (values: CreateAdultoMayorRequest) => void;
    }
  | {
      mode: "edit";
      detail: AdultoMayorDetail;
      error: string | null;
      isPending: boolean;
      onCancel: () => void;
      onSubmit: (values: UpdateAdultoMayorRequest) => void;
    };

export function AdultoMayorForm(props: AdultoMayorFormProps) {
  const [activeSection, setActiveSection] = useState<AdultoMayorFormSectionId>("personal");
  const tabPanelIdPrefix = useId();
  const detail = props.mode === "edit" ? props.detail : null;
  const shouldShowTenantSelect = props.mode === "create" && props.shouldSelectTenant;
  const form = useForm<AdultoMayorFormValues>({
    resolver: zodResolver(adultoMayorFormSchema) as Resolver<AdultoMayorFormValues>,
    defaultValues:
      props.mode === "edit"
        ? toAdultoMayorFormValues(props.detail)
        : createDefaultAdultoMayorFormValues(),
    mode: "onBlur",
  });
  const { reset, setError } = form;

  useEffect(() => {
    if (detail !== null) {
      reset(toAdultoMayorFormValues(detail));
    }
  }, [detail, reset]);

  function getError(field: keyof AdultoMayorFormValues): string | undefined {
    const message = form.formState.errors[field]?.message;

    return typeof message === "string" ? message : undefined;
  }

  function handleInvalidSubmit(errors: FieldErrors<AdultoMayorFormValues>) {
    setActiveSection(findFirstSectionWithError(errors));
  }

  return (
    <form
      className="adulto-form"
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          if (props.mode === "create") {
            if (shouldShowTenantSelect && values.tenantId.trim() === "") {
              setActiveSection("personal");
              setError("tenantId", {
                type: "manual",
                message: "Selecciona un centro.",
              });
              return;
            }

            props.onSubmit(toCreateAdultoMayorRequest(values));
            return;
          }

          props.onSubmit(toUpdateAdultoMayorRequest(values));
        }, handleInvalidSubmit)(event);
      }}
    >
      <nav className="adulto-form-tabs" aria-label="Secciones del formulario" role="tablist">
        {FORM_SECTIONS.map((section) => (
          <button
            key={section.id}
            id={`${tabPanelIdPrefix}-${section.id}-tab`}
            type="button"
            role="tab"
            aria-controls={`${tabPanelIdPrefix}-${section.id}-panel`}
            aria-selected={activeSection === section.id}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <section
        className="adulto-form-panel"
        id={`${tabPanelIdPrefix}-personal-panel`}
        role="tabpanel"
        aria-labelledby={`${tabPanelIdPrefix}-personal-tab`}
        hidden={activeSection !== "personal"}
      >
        <div className="adulto-form-grid">
          {shouldShowTenantSelect ? (
            <AdultoMayorFieldGroup label="Centro" error={getError("tenantId")}>
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
            </AdultoMayorFieldGroup>
          ) : null}

          <AdultoMayorFieldGroup label="Tipo de documento" error={getError("documentType")}>
            <select
              aria-invalid={getError("documentType") === undefined ? "false" : "true"}
              {...form.register("documentType")}
            >
              <option value="cc">CC</option>
              <option value="ce">CE</option>
              <option value="passport">Pasaporte</option>
              <option value="other">Otro</option>
            </select>
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Numero de documento" error={getError("documentNumber")}>
            <input
              type="text"
              inputMode="text"
              aria-invalid={getError("documentNumber") === undefined ? "false" : "true"}
              {...form.register("documentNumber")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Genero" error={getError("sex")}>
            <select
              aria-invalid={getError("sex") === undefined ? "false" : "true"}
              {...form.register("sex")}
            >
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
              <option value="other">Otro</option>
            </select>
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Primer nombre" error={getError("firstName")}>
            <input
              type="text"
              autoComplete="given-name"
              aria-invalid={getError("firstName") === undefined ? "false" : "true"}
              {...form.register("firstName")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Segundo nombre" error={getError("middleName")}>
            <input
              type="text"
              autoComplete="additional-name"
              aria-invalid={getError("middleName") === undefined ? "false" : "true"}
              {...form.register("middleName")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Primer apellido" error={getError("firstSurname")}>
            <input
              type="text"
              autoComplete="family-name"
              aria-invalid={getError("firstSurname") === undefined ? "false" : "true"}
              {...form.register("firstSurname")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Segundo apellido" error={getError("secondSurname")}>
            <input
              type="text"
              aria-invalid={getError("secondSurname") === undefined ? "false" : "true"}
              {...form.register("secondSurname")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Fecha nacimiento" error={getError("birthDate")}>
            <input
              type="date"
              aria-invalid={getError("birthDate") === undefined ? "false" : "true"}
              {...form.register("birthDate")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Nivel academico" error={getError("educationLevel")}>
            <input
              type="text"
              aria-invalid={getError("educationLevel") === undefined ? "false" : "true"}
              {...form.register("educationLevel")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Discapacidad" error={getError("disability")}>
            <input
              type="text"
              aria-invalid={getError("disability") === undefined ? "false" : "true"}
              {...form.register("disability")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Grupo poblacional" error={getError("populationGroup")}>
            <input
              type="text"
              aria-invalid={getError("populationGroup") === undefined ? "false" : "true"}
              {...form.register("populationGroup")}
            />
          </AdultoMayorFieldGroup>
        </div>
      </section>

      <section
        className="adulto-form-panel"
        id={`${tabPanelIdPrefix}-residence-panel`}
        role="tabpanel"
        aria-labelledby={`${tabPanelIdPrefix}-residence-tab`}
        hidden={activeSection !== "residence"}
      >
        <div className="adulto-form-grid">
          <AdultoMayorFieldGroup label="Direccion" error={getError("address")}>
            <input
              type="text"
              autoComplete="street-address"
              aria-invalid={getError("address") === undefined ? "false" : "true"}
              {...form.register("address")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Departamento" error={getError("department")}>
            <input
              type="text"
              autoComplete="address-level1"
              aria-invalid={getError("department") === undefined ? "false" : "true"}
              {...form.register("department")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Municipio" error={getError("municipality")}>
            <input
              type="text"
              autoComplete="address-level2"
              aria-invalid={getError("municipality") === undefined ? "false" : "true"}
              {...form.register("municipality")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Zona" error={getError("zone")}>
            <select
              aria-invalid={getError("zone") === undefined ? "false" : "true"}
              {...form.register("zone")}
            >
              <option value="urban">Urbana</option>
              <option value="rural">Rural</option>
            </select>
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Pais" error={getError("country")}>
            <input
              type="text"
              autoComplete="country-name"
              aria-invalid={getError("country") === undefined ? "false" : "true"}
              {...form.register("country")}
            />
          </AdultoMayorFieldGroup>
        </div>
      </section>

      <section
        className="adulto-form-panel"
        id={`${tabPanelIdPrefix}-contact-panel`}
        role="tabpanel"
        aria-labelledby={`${tabPanelIdPrefix}-contact-tab`}
        hidden={activeSection !== "contact"}
      >
        <div className="adulto-form-grid">
          <AdultoMayorFieldGroup label="Telefono 1" error={getError("phone")}>
            <input
              type="tel"
              autoComplete="tel"
              aria-invalid={getError("phone") === undefined ? "false" : "true"}
              {...form.register("phone")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Telefono 2" error={getError("phoneSecondary")}>
            <input
              type="tel"
              aria-invalid={getError("phoneSecondary") === undefined ? "false" : "true"}
              {...form.register("phoneSecondary")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Correo" error={getError("email")}>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-invalid={getError("email") === undefined ? "false" : "true"}
              {...form.register("email")}
            />
          </AdultoMayorFieldGroup>

          <div className="adulto-form-divider">Contacto de emergencia</div>

          <AdultoMayorFieldGroup
            label="Nombre completo"
            error={getError("emergencyContactFullName")}
          >
            <input
              type="text"
              autoComplete="name"
              aria-invalid={getError("emergencyContactFullName") === undefined ? "false" : "true"}
              {...form.register("emergencyContactFullName")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup
            label="Parentesco"
            error={getError("emergencyContactRelationship")}
          >
            <input
              type="text"
              aria-invalid={
                getError("emergencyContactRelationship") === undefined ? "false" : "true"
              }
              {...form.register("emergencyContactRelationship")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup
            label="Telefono de contacto"
            error={getError("emergencyContactPhone")}
          >
            <input
              type="tel"
              aria-invalid={getError("emergencyContactPhone") === undefined ? "false" : "true"}
              {...form.register("emergencyContactPhone")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup
            label="Direccion de contacto"
            error={getError("emergencyContactAddress")}
          >
            <input
              type="text"
              aria-invalid={getError("emergencyContactAddress") === undefined ? "false" : "true"}
              {...form.register("emergencyContactAddress")}
            />
          </AdultoMayorFieldGroup>
        </div>
      </section>

      <section
        className="adulto-form-panel"
        id={`${tabPanelIdPrefix}-health-panel`}
        role="tabpanel"
        aria-labelledby={`${tabPanelIdPrefix}-health-tab`}
        hidden={activeSection !== "health"}
      >
        <div className="adulto-form-grid">
          <AdultoMayorFieldGroup label="Tipo de sangre" error={getError("bloodType")}>
            <select
              aria-invalid={getError("bloodType") === undefined ? "false" : "true"}
              {...form.register("bloodType")}
            >
              <option value="">Seleccionar</option>
              <option value="a_positive">A+</option>
              <option value="a_negative">A-</option>
              <option value="b_positive">B+</option>
              <option value="b_negative">B-</option>
              <option value="ab_positive">AB+</option>
              <option value="ab_negative">AB-</option>
              <option value="o_positive">O+</option>
              <option value="o_negative">O-</option>
              <option value="unknown">No sabe</option>
            </select>
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Sisben" error={getError("sisben")}>
            <input
              type="text"
              aria-invalid={getError("sisben") === undefined ? "false" : "true"}
              {...form.register("sisben")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Regimen" error={getError("healthRegime")}>
            <select
              aria-invalid={getError("healthRegime") === undefined ? "false" : "true"}
              {...form.register("healthRegime")}
            >
              <option value="">Seleccionar</option>
              <option value="contributory">Contributivo</option>
              <option value="subsidized">Subsidiado</option>
              <option value="special">Especial</option>
              <option value="exception">Excepcion</option>
              <option value="uninsured">No afiliado</option>
              <option value="unknown">No sabe</option>
            </select>
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="EPS" error={getError("eps")}>
            <input
              type="text"
              aria-invalid={getError("eps") === undefined ? "false" : "true"}
              {...form.register("eps")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Acompanante" error={getError("companion")}>
            <input
              type="text"
              aria-invalid={getError("companion") === undefined ? "false" : "true"}
              {...form.register("companion")}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Ingreso economico" error={getError("economicIncome")}>
            <input
              type="text"
              inputMode="numeric"
              aria-invalid={getError("economicIncome") === undefined ? "false" : "true"}
              {...form.register("economicIncome")}
            />
          </AdultoMayorFieldGroup>
        </div>

        <div className="adulto-form-switches">
          <label className="adulto-switch-field">
            <input type="checkbox" {...form.register("livesWithSomeone")} />
            <span>Convive con alguien</span>
          </label>

          <label className="adulto-switch-field">
            <input type="checkbox" {...form.register("socialProgramBeneficiary")} />
            <span>Beneficiario programa social</span>
          </label>
        </div>
      </section>

      {props.error !== null ? (
        <p className="form-error" role="alert">
          {props.error}
        </p>
      ) : null}

      <div className="adulto-form-actions">
        <button className="outline-action" type="button" onClick={props.onCancel}>
          Volver
        </button>
        <button className="primary-action" disabled={props.isPending} type="submit">
          {props.isPending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function findFirstSectionWithError(
  errors: FieldErrors<AdultoMayorFormValues>,
): AdultoMayorFormSectionId {
  const errorFields = new Set(Object.keys(errors));
  const section = FORM_SECTIONS.find((candidate) =>
    candidate.fields.some((field) => errorFields.has(field)),
  );

  return section?.id ?? "personal";
}
