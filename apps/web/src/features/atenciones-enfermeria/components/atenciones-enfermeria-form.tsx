import {
  type AtencionEnfermeriaAdultoResumen,
  type AtencionEnfermeriaDetail,
} from "@cuidarte/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft } from "lucide-react";
import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import {
  type FieldErrors,
  type FieldPath,
  type Resolver,
  type UseFormRegisterReturn,
  useForm,
  useWatch,
} from "react-hook-form";

import {
  ATENCIONES_ENFERMERIA_CARE_TYPE_LABELS,
  ATENCIONES_ENFERMERIA_GLUCOMETRIA_CONTEXT_LABELS,
  formatAtencionEnfermeriaProfessionalRole,
} from "../lib/atenciones-enfermeria-formatters";
import { HistoriaClinicaTable } from "@/features/atenciones-individuales/components/historia-clinica-table";
import { resolveAtencionIndividualApiError } from "@/features/atenciones-individuales/lib/atenciones-individuales-formatters";
import { useMedicalHistoriaClinicaQuery } from "@/features/atenciones-individuales/model/atenciones-individuales-queries";
import {
  createDefaultAtencionesEnfermeriaFormValues,
  getAtencionesEnfermeriaImc,
  type AtencionesEnfermeriaFormValues,
  atencionesEnfermeriaFormSchema,
  toAtencionesEnfermeriaFormValues,
} from "../schemas/atenciones-enfermeria-form.schema";
import { AtencionesEnfermeriaFieldGroup } from "./atenciones-enfermeria-field-group";

const CREATE_DRAFT_STORAGE_KEY_PREFIX = "atencion-enfermeria-create-draft";

const FORM_SECTIONS = [
  {
    id: "datos",
    label: "Datos de la atencion",
    fields: ["attentionDate", "attentionTime", "careType", "reason"],
  },
  {
    id: "signos",
    label: "Signos vitales",
    fields: [
      "tensionSistolica",
      "tensionDiastolica",
      "frecuenciaCardiaca",
      "frecuenciaRespiratoria",
      "temperatura",
      "saturacionOxigeno",
      "pesoKg",
      "tallaCm",
      "perimetroAbdominalCm",
      "glucometriaMgDl",
      "glucometriaContext",
    ],
  },
  {
    id: "nota",
    label: "Nota de enfermeria",
    fields: ["nursingNote"],
  },
  {
    id: "medicas",
    label: "Atenciones médicas",
    fields: [],
  },
] as const;

type SectionId = (typeof FORM_SECTIONS)[number]["id"];

type AtencionesEnfermeriaFormProps =
  | {
      mode: "create";
      adultoMayor: AtencionEnfermeriaAdultoResumen;
      error: string | null;
      isPending: boolean;
      onCancel: () => void;
      onOpenMedicalAttention: (atencionId: string) => void;
      onSubmit: (values: AtencionesEnfermeriaFormValues) => Promise<void> | void;
    }
  | {
      mode: "edit";
      detail: AtencionEnfermeriaDetail;
      error: string | null;
      isPending: boolean;
      onCancel: () => void;
      onOpenMedicalAttention: (atencionId: string) => void;
      onSubmit: (values: AtencionesEnfermeriaFormValues) => Promise<void> | void;
    }
  | {
      mode: "view";
      detail: AtencionEnfermeriaDetail;
      onCancel: () => void;
      onOpenMedicalAttention: (atencionId: string) => void;
    };

export function AtencionesEnfermeriaForm(props: AtencionesEnfermeriaFormProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("datos");
  const tabPanelIdPrefix = useId();
  const isReadOnly = props.mode === "view";
  const adultSummary = props.mode === "create" ? props.adultoMayor : props.detail.adultoMayor;
  const detail = props.mode === "create" ? null : props.detail;
  const createDraftStorageKey =
    props.mode === "create" ? buildCreateDraftStorageKey(props.adultoMayor.id) : null;
  const activeSectionIndex = FORM_SECTIONS.findIndex((section) => section.id === activeSection);
  const isNoteSection = activeSection === "nota";
  const isMedicalHistorySection = activeSection === "medicas";
  const medicalHistoryQuery = useMedicalHistoriaClinicaQuery(
    adultSummary.id,
    activeSection === "medicas",
  );
  const formError = "error" in props ? (props.error ?? null) : null;

  const form = useForm<AtencionesEnfermeriaFormValues>({
    resolver: zodResolver(
      atencionesEnfermeriaFormSchema,
    ) as Resolver<AtencionesEnfermeriaFormValues>,
    defaultValues:
      props.mode === "create"
        ? createDefaultAtencionesEnfermeriaFormValues()
        : toAtencionesEnfermeriaFormValues(props.detail),
    mode: "onBlur",
  });

  const { formState, register, reset } = form;
  const watchedWeight = useWatch({ control: form.control, name: "pesoKg" });
  const watchedHeight = useWatch({ control: form.control, name: "tallaCm" });
  const imc = useMemo(
    () => getAtencionesEnfermeriaImc({ pesoKg: watchedWeight, tallaCm: watchedHeight }),
    [watchedHeight, watchedWeight],
  );
  const consecutive = detail?.version ?? 1;

  useEffect(() => {
    if (detail !== null) {
      reset(toAtencionesEnfermeriaFormValues(detail));
    }
  }, [detail, reset]);

  useEffect(() => {
    if (props.mode !== "create" || createDraftStorageKey === null) {
      return;
    }

    const savedDraft = readCreateDraft(
      createDraftStorageKey,
      createDefaultAtencionesEnfermeriaFormValues(),
    );

    if (savedDraft === null) {
      return;
    }

    reset(savedDraft.values);
    setActiveSection(savedDraft.activeSection);
  }, [createDraftStorageKey, props.mode, reset]);

  useEffect(() => {
    if (formError === null) {
      return;
    }

    toast.error(formError, { id: "atenciones-enfermeria-form-error" });
  }, [formError]);

  useEffect(() => {
    if (props.mode !== "create" || createDraftStorageKey === null) {
      return;
    }

    const subscription = form.watch((values) => {
      writeCreateDraft(createDraftStorageKey, {
        activeSection,
        values: values as AtencionesEnfermeriaFormValues,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [activeSection, createDraftStorageKey, form, props.mode]);

  function showValidationError(errors: FieldErrors<AtencionesEnfermeriaFormValues>) {
    const message = getFirstValidationErrorMessage(errors);

    toast.error(message ?? "Revisa los campos marcados antes de continuar.", {
      id: "atenciones-enfermeria-validation-error",
    });
  }

  function handleInvalidSubmit(errors: FieldErrors<AtencionesEnfermeriaFormValues>) {
    const firstSectionWithError = findFirstSectionWithError(errors);

    if (firstSectionWithError !== null) {
      setActiveSection(firstSectionWithError);
    }

    showValidationError(errors);
  }

  async function goToNextSection() {
    if (props.mode === "view") {
      return;
    }

    const currentSection = FORM_SECTIONS[activeSectionIndex];

    if (currentSection === undefined) {
      return;
    }

    const sectionFields = [...currentSection.fields] as Array<
      FieldPath<AtencionesEnfermeriaFormValues>
    >;
    const isSectionValid = await form.trigger(sectionFields, { shouldFocus: true });

    if (!isSectionValid) {
      showValidationError(form.formState.errors);
      return;
    }

    const nextSection = FORM_SECTIONS[activeSectionIndex + 1];

    if (nextSection !== undefined) {
      setActiveSection(nextSection.id);
    }
  }

  async function submitForm() {
    if (props.mode === "view") {
      return;
    }

    await form.handleSubmit(async (values) => {
      await props.onSubmit(values);
      clearCreateDraft(createDraftStorageKey);
    }, handleInvalidSubmit)();
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (props.mode === "view") {
      return;
    }

    if (isNoteSection) {
      await submitForm();
      return;
    }

    if (isMedicalHistorySection) {
      return;
    }

    await goToNextSection();
  }

  return (
    <form className="atenciones-enfermeria-form" noValidate onSubmit={handleFormSubmit}>
      <section
        className="atenciones-enfermeria-summary atenciones-enfermeria-summary--adulto"
        aria-label="Resumen del adulto mayor"
      >
        <div className="atenciones-enfermeria-summary__identity">
          <span className="eyebrow">Adulto mayor</span>
          <h2>{adultSummary.fullName}</h2>
        </div>
        <dl className="atenciones-enfermeria-summary__grid">
          <div>
            <dt>Documento</dt>
            <dd>{adultSummary.documentNumber}</dd>
          </div>
          <div>
            <dt>Centro</dt>
            <dd>{adultSummary.tenantName}</dd>
          </div>
          <div>
            <dt>Edad</dt>
            <dd>{adultSummary.age}</dd>
          </div>
          <div>
            <dt>EPS</dt>
            <dd>{adultSummary.eps ?? "Sin dato"}</dd>
          </div>
          {detail !== null ? (
            <>
              <div>
                <dt>Profesional</dt>
                <dd>
                  {detail.professional.fullName}
                  <small>
                    {formatAtencionEnfermeriaProfessionalRole(detail.professional.role)}
                  </small>
                </dd>
              </div>
              <div>
                <dt>Acceso</dt>
                <dd>{detail.access === "edit" ? "Editar" : "Ver"}</dd>
              </div>
            </>
          ) : null}
        </dl>
      </section>

      <nav className="atenciones-enfermeria-tabs" aria-label="Secciones de la atencion">
        {FORM_SECTIONS.map((section) => (
          <button
            key={section.id}
            id={`${tabPanelIdPrefix}-tab-${section.id}`}
            className={activeSection === section.id ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={activeSection === section.id}
            aria-controls={`${tabPanelIdPrefix}-panel-${section.id}`}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <section
        id={`${tabPanelIdPrefix}-panel-datos`}
        className="atenciones-enfermeria-panel"
        role="tabpanel"
        aria-labelledby={`${tabPanelIdPrefix}-tab-datos`}
        hidden={activeSection !== "datos"}
      >
        <input type="hidden" {...register("attentionTime")} />

        <div className="atenciones-enfermeria-grid atenciones-enfermeria-grid--three">
          <AtencionesEnfermeriaFieldGroup
            label="Fecha"
            error={getError(formState.errors, "attentionDate")}
          >
            <input type="date" readOnly={isReadOnly} {...register("attentionDate")} />
          </AtencionesEnfermeriaFieldGroup>

          <AtencionesEnfermeriaFieldGroup label="Modalidad de la consulta">
            <input value="Intramural" readOnly />
          </AtencionesEnfermeriaFieldGroup>

          <AtencionesEnfermeriaFieldGroup label="Tipo de consulta">
            <input value={props.mode === "create" ? "Primera vez" : "Seguimiento"} readOnly />
          </AtencionesEnfermeriaFieldGroup>

          <AtencionesEnfermeriaFieldGroup label="Nombre de la consulta">
            <input value="Atención de enfermería" readOnly />
          </AtencionesEnfermeriaFieldGroup>

          <AtencionesEnfermeriaFieldGroup label="Consecutivo">
            <input value={String(consecutive)} readOnly />
          </AtencionesEnfermeriaFieldGroup>

          <SelectField
            label="Finalidad de la Consulta"
            error={getError(formState.errors, "careType")}
            readOnly={isReadOnly}
            register={register("careType")}
          >
            <option value="control_signos_vitales">
              {ATENCIONES_ENFERMERIA_CARE_TYPE_LABELS.control_signos_vitales}
            </option>
            <option value="seguimiento">
              {ATENCIONES_ENFERMERIA_CARE_TYPE_LABELS.seguimiento}
            </option>
            <option value="procedimiento">
              {ATENCIONES_ENFERMERIA_CARE_TYPE_LABELS.procedimiento}
            </option>
            <option value="otro">{ATENCIONES_ENFERMERIA_CARE_TYPE_LABELS.otro}</option>
          </SelectField>

          <TextField
            label="Causa Externa"
            error={getError(formState.errors, "reason")}
            readOnly={isReadOnly}
            register={register("reason")}
            placeholder="Describe la causa externa"
          />
        </div>
      </section>

      <section
        id={`${tabPanelIdPrefix}-panel-signos`}
        className="atenciones-enfermeria-panel"
        role="tabpanel"
        aria-labelledby={`${tabPanelIdPrefix}-tab-signos`}
        hidden={activeSection !== "signos"}
      >
        <div className="atenciones-enfermeria-grid atenciones-enfermeria-grid--three">
          <NumberField
            label="Tension sistolica"
            error={getError(formState.errors, "tensionSistolica")}
            readOnly={isReadOnly}
            register={register("tensionSistolica")}
          />
          <NumberField
            label="Tension diastolica"
            error={getError(formState.errors, "tensionDiastolica")}
            readOnly={isReadOnly}
            register={register("tensionDiastolica")}
          />
          <NumberField
            label="Frecuencia cardiaca"
            error={getError(formState.errors, "frecuenciaCardiaca")}
            readOnly={isReadOnly}
            register={register("frecuenciaCardiaca")}
          />
          <NumberField
            label="Frecuencia respiratoria"
            error={getError(formState.errors, "frecuenciaRespiratoria")}
            readOnly={isReadOnly}
            register={register("frecuenciaRespiratoria")}
          />
          <NumberField
            label="Temperatura"
            error={getError(formState.errors, "temperatura")}
            readOnly={isReadOnly}
            register={register("temperatura")}
          />
          <NumberField
            label="Saturacion de oxigeno"
            error={getError(formState.errors, "saturacionOxigeno")}
            readOnly={isReadOnly}
            register={register("saturacionOxigeno")}
          />
          <NumberField
            label="Peso (kg)"
            error={getError(formState.errors, "pesoKg")}
            readOnly={isReadOnly}
            register={register("pesoKg")}
          />
          <NumberField
            label="Talla (cm)"
            error={getError(formState.errors, "tallaCm")}
            readOnly={isReadOnly}
            register={register("tallaCm")}
          />
          <AtencionesEnfermeriaFieldGroup label="IMC calculado">
            <input value={imc === "" ? "Sin calculo" : imc} readOnly />
          </AtencionesEnfermeriaFieldGroup>
          <NumberField
            label="Perimetro abdominal (cm)"
            error={getError(formState.errors, "perimetroAbdominalCm")}
            readOnly={isReadOnly}
            register={register("perimetroAbdominalCm")}
          />
        </div>

        <div className="atenciones-enfermeria-grid atenciones-enfermeria-grid--glucometria">
          <NumberField
            label="Glucometria (mg/dL)"
            error={getError(formState.errors, "glucometriaMgDl")}
            readOnly={isReadOnly}
            register={register("glucometriaMgDl")}
          />
          <SelectField
            label="Contexto glucometria"
            error={getError(formState.errors, "glucometriaContext")}
            readOnly={isReadOnly}
            register={register("glucometriaContext")}
          >
            <option value="">Selecciona una opcion</option>
            <option value="ayunas">
              {ATENCIONES_ENFERMERIA_GLUCOMETRIA_CONTEXT_LABELS.ayunas}
            </option>
            <option value="antes_de_comida">
              {ATENCIONES_ENFERMERIA_GLUCOMETRIA_CONTEXT_LABELS.antes_de_comida}
            </option>
            <option value="despues_de_comida">
              {ATENCIONES_ENFERMERIA_GLUCOMETRIA_CONTEXT_LABELS.despues_de_comida}
            </option>
            <option value="aleatoria">
              {ATENCIONES_ENFERMERIA_GLUCOMETRIA_CONTEXT_LABELS.aleatoria}
            </option>
          </SelectField>
        </div>
      </section>

      <section
        id={`${tabPanelIdPrefix}-panel-nota`}
        className="atenciones-enfermeria-panel"
        role="tabpanel"
        aria-labelledby={`${tabPanelIdPrefix}-tab-nota`}
        hidden={activeSection !== "nota"}
      >
        <TextAreaField
          label="Nota de enfermeria"
          error={getError(formState.errors, "nursingNote")}
          readOnly={isReadOnly}
          register={register("nursingNote")}
          rows={8}
        />

        {isReadOnly ? null : (
          <div className="atenciones-enfermeria-panel-actions">
            <button
              className="primary-action"
              type="submit"
              disabled={"isPending" in props ? props.isPending : false}
            >
              <span>{props.mode === "create" ? "Crear atencion" : "Guardar cambios"}</span>
            </button>
          </div>
        )}
      </section>

      <section
        id={`${tabPanelIdPrefix}-panel-medicas`}
        className="atenciones-enfermeria-panel"
        role="tabpanel"
        aria-labelledby={`${tabPanelIdPrefix}-tab-medicas`}
        hidden={activeSection !== "medicas"}
      >
        <div className="atencion-cross-history-header">
          <div>
            <span className="eyebrow">Consulta cruzada</span>
            <h3>Atenciones médicas</h3>
            <p>
              Las atenciones médicas se muestran en modo lectura y se cargan solo al abrir esta
              pestaña.
            </p>
          </div>
        </div>

        {medicalHistoryQuery.isError ? (
          <p className="form-error" role="alert">
            {resolveAtencionIndividualApiError(medicalHistoryQuery.error)}
          </p>
        ) : (
          <HistoriaClinicaTable
            atenciones={medicalHistoryQuery.data?.atenciones ?? []}
            isLoading={medicalHistoryQuery.isLoading}
            onOpenAtencion={(atencion) => props.onOpenMedicalAttention(atencion.id)}
          />
        )}
      </section>

      {formError !== null ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="atenciones-enfermeria-actions">
        <button className="outline-action" type="button" onClick={props.onCancel}>
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>

        {isReadOnly || isNoteSection || isMedicalHistorySection ? null : (
          <button
            className="primary-action"
            type="submit"
            disabled={"isPending" in props ? props.isPending : false}
          >
            <span>Continuar</span>
          </button>
        )}
      </div>
    </form>
  );
}

function getError<TField extends keyof AtencionesEnfermeriaFormValues>(
  errors: FieldErrors<AtencionesEnfermeriaFormValues>,
  field: TField,
): string | undefined {
  const message = errors[field]?.message;

  return typeof message === "string" ? message : undefined;
}

function getFirstValidationErrorMessage(
  errors: FieldErrors<AtencionesEnfermeriaFormValues>,
): string | undefined {
  for (const section of FORM_SECTIONS) {
    for (const field of section.fields) {
      const message = errors[field as keyof AtencionesEnfermeriaFormValues]?.message;

      if (typeof message === "string") {
        return message;
      }
    }
  }

  return undefined;
}

function findFirstSectionWithError(
  errors: Partial<Record<keyof AtencionesEnfermeriaFormValues, unknown>>,
): SectionId | null {
  for (const section of FORM_SECTIONS) {
    if (
      section.fields.some(
        (field) => errors[field as keyof AtencionesEnfermeriaFormValues] !== undefined,
      )
    ) {
      return section.id;
    }
  }

  return null;
}

function buildCreateDraftStorageKey(adultoMayorId: string): string {
  return `${CREATE_DRAFT_STORAGE_KEY_PREFIX}:${adultoMayorId}`;
}

function readCreateDraft(
  storageKey: string,
  fallbackValues: AtencionesEnfermeriaFormValues,
): { activeSection: SectionId; values: AtencionesEnfermeriaFormValues } | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(storageKey);

  if (rawValue === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<{
      activeSection: SectionId;
      values: AtencionesEnfermeriaFormValues;
    }>;

    if (parsed.activeSection === undefined || parsed.values === undefined) {
      return null;
    }

    return {
      activeSection: FORM_SECTIONS.some((section) => section.id === parsed.activeSection)
        ? parsed.activeSection
        : "datos",
      values: hydrateCreateDraftValues(parsed.values, fallbackValues),
    };
  } catch {
    return null;
  }
}

function hydrateCreateDraftValues(
  draftValues: unknown,
  fallbackValues: AtencionesEnfermeriaFormValues,
): AtencionesEnfermeriaFormValues {
  if (typeof draftValues !== "object" || draftValues === null) {
    return fallbackValues;
  }

  return {
    ...fallbackValues,
    ...(draftValues as Partial<AtencionesEnfermeriaFormValues>),
  };
}

function writeCreateDraft(
  storageKey: string,
  draft: { activeSection: SectionId; values: AtencionesEnfermeriaFormValues },
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(draft));
}

function clearCreateDraft(storageKey: string | null): void {
  if (typeof window === "undefined" || storageKey === null) {
    return;
  }

  window.localStorage.removeItem(storageKey);
}

function SelectField({
  children,
  error,
  label,
  readOnly,
  register,
}: {
  children: ReactNode;
  error: string | undefined;
  label: string;
  readOnly: boolean;
  register: UseFormRegisterReturn;
}) {
  return (
    <AtencionesEnfermeriaFieldGroup label={label} error={error}>
      <select {...register} disabled={readOnly}>
        {children}
      </select>
    </AtencionesEnfermeriaFieldGroup>
  );
}

function TextAreaField({
  error,
  label,
  readOnly,
  register,
  rows,
}: {
  error: string | undefined;
  label: string;
  readOnly: boolean;
  register: UseFormRegisterReturn;
  rows: number;
}) {
  return (
    <AtencionesEnfermeriaFieldGroup label={label} error={error}>
      <textarea {...register} readOnly={readOnly} rows={rows} />
    </AtencionesEnfermeriaFieldGroup>
  );
}

function TextField({
  error,
  label,
  placeholder,
  readOnly,
  register,
}: {
  error: string | undefined;
  label: string;
  placeholder?: string;
  readOnly: boolean;
  register: UseFormRegisterReturn;
}) {
  return (
    <AtencionesEnfermeriaFieldGroup label={label} error={error}>
      <input {...register} placeholder={placeholder} readOnly={readOnly} />
    </AtencionesEnfermeriaFieldGroup>
  );
}

function NumberField({
  error,
  label,
  readOnly,
  register,
}: {
  error: string | undefined;
  label: string;
  readOnly: boolean;
  register: UseFormRegisterReturn;
}) {
  return (
    <AtencionesEnfermeriaFieldGroup label={label} error={error}>
      <input type="text" inputMode="decimal" {...register} readOnly={readOnly} />
    </AtencionesEnfermeriaFieldGroup>
  );
}
