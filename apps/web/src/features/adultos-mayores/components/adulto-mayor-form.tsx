import {
  type AdultoMayorDetail,
  type AdultoMayorTenantOption,
  type CreateAdultoMayorRequest,
  type UpdateAdultoMayorRequest,
} from "@cuidarte/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, type Resolver, type FieldErrors, useForm, useWatch } from "react-hook-form";
import { useEffect, useId, useRef, useState } from "react";
import { Eye, FileText, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  type AdultoMayorFormValues,
  adultoMayorFormSchema,
  createDefaultAdultoMayorFormValues,
  toAdultoMayorFormValues,
  toCreateAdultoMayorRequest,
  toUpdateAdultoMayorRequest,
} from "../schemas/adulto-mayor-form.schema";
import { AdultoMayorFieldGroup } from "./adulto-mayor-field-group";
import { getApiBaseUrl } from "@/shared/api/api-config";
import { SearchableCatalogCombobox } from "@/shared/components/searchable-catalog-combobox";
import { SearchableCombobox } from "@/shared/components/searchable-combobox";
import { findNamedOptionByName, getNamedOptionLabel } from "@/shared/lib/named-options";
import { useEpsQuery } from "../../eps/model/eps-queries";
import { buildDisabilityOptions } from "../lib/disability-options";
import { buildEducationLevelOptions } from "../lib/education-level-options";
import { buildHealthRegimeOptions } from "../lib/health-regime-options";
import { buildPopulationGroupOptions } from "../lib/population-group-options";
import {
  findLocationOptionByName,
  getLocationOptionLabel,
} from "../../ubicaciones/lib/location-options";
import {
  useDepartmentsQuery,
  useMunicipalitiesQuery,
} from "../../ubicaciones/model/ubicaciones-queries";

const FORM_SECTIONS = [
  {
    id: "personal",
    label: "Datos personales",
    fields: [
      "tenantId",
      "documentType",
      "documentNumber",
      "sex",
      "status",
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
    fields: ["address", "departmentId", "municipalityId", "zone", "country"],
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
      "epsId",
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

const CREATE_DRAFT_STORAGE_KEY = "adulto-mayor-create-draft";

type AdultoMayorFormSectionId = (typeof FORM_SECTIONS)[number]["id"];
type AdultoMayorCreateDraft = {
  activeSection: AdultoMayorFormSectionId;
  values: AdultoMayorFormValues;
};

type AdultoMayorFormProps =
  | {
      mode: "create";
      areTenantOptionsLoading: boolean;
      error: string | null;
      isPending: boolean;
      shouldSelectTenant: boolean;
      tenantOptions: AdultoMayorTenantOption[];
      onCancel: () => void;
      onDeleteDocument?: () => Promise<void>;
      onSubmit: (values: CreateAdultoMayorRequest, documentFile: File | null) => Promise<void> | void;
    }
  | {
      mode: "edit";
      detail: AdultoMayorDetail;
      error: string | null;
      isPending: boolean;
      onCancel: () => void;
      onDeleteDocument: () => Promise<void>;
      onSubmit: (values: UpdateAdultoMayorRequest, documentFile: File | null) => Promise<void> | void;
    };

export function AdultoMayorForm(props: AdultoMayorFormProps) {
  const [activeSection, setActiveSection] = useState<AdultoMayorFormSectionId>("personal");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
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
  const getValues = form.getValues;
  const departmentId = useWatch({
    control: form.control,
    name: "departmentId",
  });
  const municipalityId = useWatch({
    control: form.control,
    name: "municipalityId",
  });
  const epsId = useWatch({
    control: form.control,
    name: "epsId",
  });
  const departmentsQuery = useDepartmentsQuery();
  const epsQuery = useEpsQuery();
  const municipalitiesQuery = useMunicipalitiesQuery(departmentId, departmentId.trim() !== "");
  const departmentOptions = departmentsQuery.data?.departments ?? [];
  const municipalityOptions = municipalitiesQuery.data?.municipalities ?? [];
  const activeEpsOptions = epsQuery.data?.eps ?? [];
  const epsOptions =
    detail?.epsId !== null &&
    detail?.epsId !== undefined &&
    detail.epsName !== null &&
    !activeEpsOptions.some((option) => option.id === detail.epsId)
      ? [{ id: detail.epsId, code: "", name: detail.epsName }, ...activeEpsOptions]
      : activeEpsOptions;
  const educationLevelOptions = buildEducationLevelOptions(detail?.educationLevel ?? null);
  const disabilityOptions = buildDisabilityOptions(detail?.disability ?? null);
  const healthRegimeOptions = buildHealthRegimeOptions(detail?.healthRegime ?? null);
  const populationGroupOptions = buildPopulationGroupOptions(detail?.populationGroup ?? null);
  const hasAppliedDepartmentFallback = useRef(false);
  const hasAppliedEpsFallback = useRef(false);
  const hasAppliedMunicipalityFallback = useRef(false);
  const lastToastErrorRef = useRef<string | null>(null);
  const activeSectionIndex = FORM_SECTIONS.findIndex((section) => section.id === activeSection);
  const isLastSection = activeSectionIndex === FORM_SECTIONS.length - 1;

  useEffect(() => {
    if (detail !== null) {
      hasAppliedDepartmentFallback.current = false;
      hasAppliedEpsFallback.current = false;
      hasAppliedMunicipalityFallback.current = false;
      reset(toAdultoMayorFormValues(detail));
    }
  }, [detail, reset]);

  useEffect(() => {
    if (props.error === null) {
      lastToastErrorRef.current = null;
      return;
    }

    if (lastToastErrorRef.current === props.error) {
      return;
    }

    lastToastErrorRef.current = props.error;
    toast.error(props.error, { id: "adulto-mayor-form-error" });
  }, [props.error]);

  useEffect(() => {
    if (props.mode !== "create") {
      return;
    }

    const savedDraft = readCreateDraft();

    if (savedDraft === null) {
      return;
    }

    reset(savedDraft.values);
    setActiveSection(savedDraft.activeSection);
  }, [props.mode, reset]);

  useEffect(() => {
    if (props.mode !== "create") {
      return;
    }

    writeCreateDraft({
      activeSection,
      values: getValues(),
    });

    const subscription = form.watch((values) => {
      writeCreateDraft({
        activeSection,
        values: values as AdultoMayorFormValues,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [activeSection, form, getValues, props.mode]);

  useEffect(() => {
    if (
      detail === null ||
      departmentId.trim() !== "" ||
      departmentsQuery.data === undefined ||
      hasAppliedDepartmentFallback.current
    ) {
      return;
    }

    const fallbackDepartment = findLocationOptionByName(departmentOptions, detail.department);

    if (fallbackDepartment === null) {
      return;
    }

    hasAppliedDepartmentFallback.current = true;
    form.setValue("departmentId", fallbackDepartment.id, {
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

    const fallbackMunicipality = findLocationOptionByName(municipalityOptions, detail.municipality);

    if (fallbackMunicipality === null) {
      return;
    }

    hasAppliedMunicipalityFallback.current = true;
    form.setValue("municipalityId", fallbackMunicipality.id, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [departmentId, detail, form, municipalitiesQuery.data, municipalityId, municipalityOptions]);

  useEffect(() => {
    if (
      detail === null ||
      epsId.trim() !== "" ||
      epsQuery.data === undefined ||
      hasAppliedEpsFallback.current
    ) {
      return;
    }

    const fallbackEps = findNamedOptionByName(activeEpsOptions, detail.eps);

    if (fallbackEps === null) {
      return;
    }

    hasAppliedEpsFallback.current = true;
    form.setValue("epsId", fallbackEps.id, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [activeEpsOptions, detail, epsId, epsQuery.data, form]);

  function getError(field: keyof AdultoMayorFormValues): string | undefined {
    const message = form.formState.errors[field]?.message;

    return typeof message === "string" ? message : undefined;
  }

  function handleInvalidSubmit(errors: FieldErrors<AdultoMayorFormValues>) {
    toast.error("No se pudo guardar porque hay campos pendientes por corregir.", {
      id: "adulto-mayor-form-validation",
    });
    setActiveSection(findFirstSectionWithError(errors));
  }

  async function submitCurrentSection() {
    const currentSection = FORM_SECTIONS[activeSectionIndex];

    if (currentSection === undefined) {
      return;
    }

    if (props.mode === "create" && activeSection === "personal" && shouldShowTenantSelect) {
      const tenantId = getValues("tenantId").trim();

      if (tenantId === "") {
        setActiveSection("personal");
        setError("tenantId", {
          type: "manual",
          message: "Selecciona un centro.",
        });
        return;
      }
    }

    if (props.mode === "create" && !isLastSection) {
      const sectionFields: Array<keyof AdultoMayorFormValues> = [...currentSection.fields];
      const isSectionValid = await form.trigger(
        sectionFields,
        { shouldFocus: true },
      );

      if (!isSectionValid) {
        return;
      }

      const nextSection = FORM_SECTIONS[activeSectionIndex + 1];

      if (nextSection !== undefined) {
        setActiveSection(nextSection.id);
      }

      return;
    }

    await form.handleSubmit(async (values) => {
      if (props.mode === "create") {
        await props.onSubmit(toCreateAdultoMayorRequest(values), documentFile);
        clearCreateDraft();
        setDocumentFile(null);
        return;
      }

      await props.onSubmit(toUpdateAdultoMayorRequest(values), documentFile);
      setDocumentFile(null);
    }, handleInvalidSubmit)();
  }

  return (
    <form
      className="adulto-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submitCurrentSection();
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

          <AdultoMayorFieldGroup label="Estado" error={getError("status")}>
            <select
              aria-invalid={getError("status") === undefined ? "false" : "true"}
              {...form.register("status")}
            >
              <option value="alive">Vivo</option>
              <option value="deceased">Fallecido</option>
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
            <Controller
              control={form.control}
              name="educationLevel"
              render={({ field }) => (
                <SearchableCatalogCombobox
                  ariaInvalid={getError("educationLevel") !== undefined}
                  ariaLabel="Nivel academico"
                  emptyMessage="No se encontraron niveles academicos."
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  options={educationLevelOptions}
                  value={field.value ?? ""}
                />
              )}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Discapacidad" error={getError("disability")}>
            <Controller
              control={form.control}
              name="disability"
              render={({ field }) => (
                <SearchableCatalogCombobox
                  ariaInvalid={getError("disability") !== undefined}
                  ariaLabel="Discapacidad"
                  emptyMessage="No se encontraron opciones de discapacidad."
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  options={disabilityOptions}
                  value={field.value ?? ""}
                />
              )}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Grupo poblacional" error={getError("populationGroup")}>
            <Controller
              control={form.control}
              name="populationGroup"
              render={({ field }) => (
                <SearchableCatalogCombobox
                  ariaInvalid={getError("populationGroup") !== undefined}
                  ariaLabel="Grupo poblacional"
                  emptyMessage="No se encontraron grupos poblacionales."
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  options={populationGroupOptions}
                  value={field.value ?? ""}
                />
              )}
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

          <AdultoMayorFieldGroup label="Departamento" error={getError("departmentId")}>
            <Controller
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <SearchableCombobox
                  ariaInvalid={getError("departmentId") !== undefined}
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
                    form.setValue("municipalityId", "", {
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
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="Municipio" error={getError("municipalityId")}>
            <Controller
              control={form.control}
              name="municipalityId"
              render={({ field }) => (
                <SearchableCombobox
                  ariaInvalid={getError("municipalityId") !== undefined}
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
            <Controller
              control={form.control}
              name="healthRegime"
              render={({ field }) => (
                <SearchableCatalogCombobox
                  ariaInvalid={getError("healthRegime") !== undefined}
                  ariaLabel="Regimen"
                  emptyMessage="No se encontraron regimenes."
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  options={healthRegimeOptions}
                  value={field.value ?? ""}
                />
              )}
            />
          </AdultoMayorFieldGroup>

          <AdultoMayorFieldGroup label="EPS" error={getError("epsId")}>
            <Controller
              control={form.control}
              name="epsId"
              render={({ field }) => (
                <SearchableCombobox
                  ariaInvalid={getError("epsId") !== undefined}
                  ariaLabel="EPS"
                  emptyMessage="No se encontraron EPS."
                  getOptionLabel={getNamedOptionLabel}
                  isLoading={epsQuery.isLoading}
                  onBlur={field.onBlur}
                  onValueChange={(nextEpsId) => {
                    if (nextEpsId !== field.value) {
                      hasAppliedEpsFallback.current = true;
                    }

                    field.onChange(nextEpsId);
                  }}
                  options={epsOptions}
                  value={field.value ?? ""}
                />
              )}
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

        <div className="adulto-document-field">
          <div className="adulto-document-field__label">
            <span>Documento PDF</span>
            <small>Opcional · máximo 10 MB</small>
          </div>
          <div className="adulto-document-field__control">
            <label className="adulto-document-field__picker">
              <FileText aria-hidden="true" />
              <span>{documentFile?.name ?? "Seleccionar PDF"}</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setDocumentFile(file);
                  event.target.value = "";
                }}
              />
            </label>
            {documentFile !== null ? (
              <button
                className="adulto-document-field__clear"
                type="button"
                aria-label="Quitar PDF seleccionado"
                onClick={() => setDocumentFile(null)}
              >
                <X aria-hidden="true" />
              </button>
            ) : null}
          </div>
          {detail?.documentFile !== null && detail?.documentFile !== undefined && documentFile === null ? (
            <div className="adulto-document-card">
              <FileText aria-hidden="true" />
              <div className="adulto-document-card__details">
                <strong>{detail.documentFile.originalName}</strong>
                <small>{formatFileSize(detail.documentFile.sizeBytes)}</small>
              </div>
              <div className="adulto-document-card__actions">
                <a
                  className="adulto-document-card__action adulto-document-card__action--view"
                  href={`${getApiBaseUrl()}/adultos-mayores/${detail.id}/document`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Ver PDF actual"
                  title="Ver PDF"
                >
                  <Eye aria-hidden="true" />
                </a>
                <button
                  className="adulto-document-card__action adulto-document-card__action--delete"
                  type="button"
                  aria-label="Eliminar PDF actual"
                  title="Eliminar PDF"
                  onClick={() => {
                    void props.onDeleteDocument?.();
                  }}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : null}
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

      <div className="adulto-form-actions">
        <button
          className="outline-action"
          type="button"
          onClick={() => {
            if (props.mode === "create") {
              clearCreateDraft();
            }

            props.onCancel();
          }}
        >
          Volver
        </button>
        <button className="primary-action" disabled={props.isPending} type="submit">
          {props.isPending
            ? "Guardando..."
            : props.mode === "create" && !isLastSection
              ? "Guardar y continuar"
              : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
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

function readCreateDraft(): AdultoMayorCreateDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(CREATE_DRAFT_STORAGE_KEY);

  if (rawValue === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<AdultoMayorCreateDraft>;

    if (parsed.activeSection === undefined || parsed.values === undefined) {
      return null;
    }

    const activeSection = FORM_SECTIONS.some((section) => section.id === parsed.activeSection)
      ? parsed.activeSection
      : "personal";

    return {
      activeSection,
      values: {
        ...createDefaultAdultoMayorFormValues(),
        ...parsed.values,
      },
    };
  } catch {
    return null;
  }
}

function writeCreateDraft(draft: AdultoMayorCreateDraft): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CREATE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

function clearCreateDraft(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CREATE_DRAFT_STORAGE_KEY);
}
