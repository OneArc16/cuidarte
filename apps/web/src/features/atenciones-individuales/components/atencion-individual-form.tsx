import {
  atencionDiagnosticoTipoValues,
  atencionIndividualCausaExternaValues,
  atencionIndividualFinalidadValues,
  atencionIndividualModalidadValues,
  atencionIndividualTipoConsultaValues,
  atencionOrdenTipoValues,
  type AtencionIndividualAdultoResumen,
  type AtencionIndividualDetail,
  type AtencionIndividualSupportFile,
} from "@cuidarte/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, FileText, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
  type FieldErrors,
  type Resolver,
  type UseFormRegisterReturn,
  type UseFormReturn,
  useFieldArray,
  useForm,
} from "react-hook-form";

import {
  buildAtencionIndividualSupportFileUrl,
  type CreateAtencionIndividualWithSupportsRequest,
  type UpdateAtencionIndividualWithSupportsRequest,
} from "../api/atenciones-individuales-api";
import {
  CAUSA_EXTERNA_LABELS,
  DIAGNOSTICO_TIPO_LABELS,
  FINALIDAD_LABELS,
  MODALIDAD_LABELS,
  ORDEN_TIPO_LABELS,
  TIPO_CONSULTA_LABELS,
} from "../lib/atenciones-individuales-formatters";
import { formatImcInput } from "../lib/imc";
import {
  type AtencionIndividualFormValues,
  atencionIndividualFormSchema,
  createDefaultAtencionIndividualFormValues,
  createDefaultDiagnostico,
  createDefaultOrden,
  toAtencionIndividualFormValues,
  toCreateAtencionIndividualRequest,
  toUpdateAtencionIndividualRequest,
} from "../schemas/atencion-individual-form.schema";
import { AtencionFieldGroup } from "./atencion-field-group";
import { Cie10AutocompleteField } from "@/features/cie10/components/cie10-autocomplete-field";

const FORM_SECTIONS = [
  {
    id: "datos",
    label: "Datos de la atencion",
    fields: [
      "attentionDate",
      "modalidad",
      "tipoConsulta",
      "nombreConsulta",
      "consecutive",
      "finalidad",
      "causaExterna",
    ],
  },
  { id: "enfermedad", label: "Enfermedad actual", fields: ["motivoConsulta", "enfermedadActual"] },
  {
    id: "antecedentes",
    label: "Antecedentes",
    fields: ["antecedentesPersonales", "antecedentesFamiliares"],
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
      "imc",
      "perimetroAbdominalCm",
      "examenFisico",
    ],
  },
  {
    id: "resultados",
    label: "Resultados",
    fields: ["resultadosLaboratorios", "resultadosProcedimientos"],
  },
  { id: "ordenes", label: "Ordenes medicas", fields: ["ordenesMedicas"] },
  { id: "diagnosticos", label: "Diagnosticos", fields: ["diagnosticos"] },
  { id: "soportes", label: "Soportes", fields: [] },
] as const;

const MAX_SUPPORT_FILES = 3;

type SectionId = (typeof FORM_SECTIONS)[number]["id"];

type AtencionIndividualFormProps =
  | {
      mode: "create";
      adultoMayor: AtencionIndividualAdultoResumen;
      suggestedConsecutive: number;
      error: string | null;
      isPending: boolean;
      onCancel: () => void;
      onSubmit: (values: CreateAtencionIndividualWithSupportsRequest) => void;
    }
  | {
      mode: "edit";
      detail: AtencionIndividualDetail;
      error: string | null;
      isPending: boolean;
      onCancel: () => void;
      onSubmit: (values: UpdateAtencionIndividualWithSupportsRequest) => void;
    }
  | {
      mode: "view";
      detail: AtencionIndividualDetail;
      onCancel: () => void;
    };

export function AtencionIndividualForm(props: AtencionIndividualFormProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("datos");
  const [newSupportFiles, setNewSupportFiles] = useState<File[]>([]);
  const [removedSupportFileIds, setRemovedSupportFileIds] = useState<string[]>([]);
  const [supportUploadError, setSupportUploadError] = useState<string | null>(null);
  const tabPanelIdPrefix = useId();
  const isReadOnly = props.mode === "view";
  const adultoMayor = props.mode === "create" ? props.adultoMayor : props.detail.adultoMayor;
  const detail = props.mode === "create" ? null : props.detail;
  const existingSupportFiles =
    props.mode !== "create"
      ? props.detail.supportFiles.filter((file) => !removedSupportFileIds.includes(file.id))
      : [];
  const supportItems = [
    ...existingSupportFiles.map((file) => ({ type: "stored" as const, file })),
    ...newSupportFiles.map((file) => ({ type: "draft" as const, file })),
  ];
  const form = useForm<AtencionIndividualFormValues>({
    resolver: zodResolver(atencionIndividualFormSchema) as Resolver<AtencionIndividualFormValues>,
    defaultValues:
      props.mode === "create"
        ? createDefaultAtencionIndividualFormValues(props.suggestedConsecutive)
        : toAtencionIndividualFormValues(props.detail),
    mode: "onBlur",
  });
  const ordenesFieldArray = useFieldArray({ control: form.control, name: "ordenesMedicas" });
  const diagnosticosFieldArray = useFieldArray({ control: form.control, name: "diagnosticos" });
  const { getValues, reset, setValue, watch } = form;
  const pesoKg = watch("pesoKg");
  const tallaCm = watch("tallaCm");

  useEffect(() => {
    if (detail !== null) {
      reset(toAtencionIndividualFormValues(detail));
      setNewSupportFiles([]);
      setRemovedSupportFileIds([]);
      setSupportUploadError(null);
    }
  }, [detail, reset]);

  useEffect(() => {
    const nextImc = formatImcInput(pesoKg, tallaCm);

    if (getValues("imc") !== nextImc) {
      setValue("imc", nextImc, { shouldValidate: true });
    }
  }, [getValues, pesoKg, setValue, tallaCm]);

  function getError(field: keyof AtencionIndividualFormValues): string | undefined {
    const message = form.formState.errors[field]?.message;

    return typeof message === "string" ? message : undefined;
  }

  function handleInvalidSubmit(errors: FieldErrors<AtencionIndividualFormValues>) {
    setActiveSection(findFirstSectionWithError(errors));
  }

  function handleSupportFiles(files: FileList | null) {
    if (isReadOnly) {
      return;
    }

    if (files === null || files.length === 0) {
      return;
    }

    const selectedFiles = Array.from(files);
    const availableSlots = MAX_SUPPORT_FILES - supportItems.length;

    if (availableSlots <= 0) {
      setSupportUploadError("Ya tienes el maximo de 3 soportes.");
      return;
    }

    if (selectedFiles.length > availableSlots) {
      setSupportUploadError(`Solo puedes agregar ${availableSlots} soporte(s) mas.`);
      return;
    }

    setNewSupportFiles((current) => [...current, ...selectedFiles]);
    setSupportUploadError(null);
  }

  function removeSupportItem(index: number) {
    if (isReadOnly) {
      return;
    }

    const item = supportItems[index];

    if (item === undefined) {
      return;
    }

    if (item.type === "stored") {
      setRemovedSupportFileIds((current) => [...current, item.file.id]);
    } else {
      setNewSupportFiles((current) => current.filter((file) => file !== item.file));
    }

    setSupportUploadError(null);
  }

  return (
    <form
      className="adulto-form atencion-form"
      noValidate
      onSubmit={
        props.mode === "view"
          ? undefined
          : (event) => {
              void form.handleSubmit((values) => {
                if (props.mode === "create") {
                  props.onSubmit({
                    payload: toCreateAtencionIndividualRequest(adultoMayor.id, values),
                    supportFiles: newSupportFiles,
                  });
                  return;
                }

                props.onSubmit({
                  payload: toUpdateAtencionIndividualRequest(values),
                  supportFiles: newSupportFiles,
                  removedSupportFileIds,
                });
              }, handleInvalidSubmit)(event);
            }
      }
    >
      <section
        className="atencion-patient-summary"
        aria-label="Informacion basica del adulto mayor"
      >
        <div>
          <span className="eyebrow">Adulto mayor</span>
          <h2>{adultoMayor.fullName}</h2>
        </div>
        <dl>
          <div>
            <dt>Documento</dt>
            <dd>{adultoMayor.documentNumber}</dd>
          </div>
          <div>
            <dt>Edad</dt>
            <dd>{adultoMayor.age}</dd>
          </div>
          <div>
            <dt>Centro</dt>
            <dd>{adultoMayor.tenantName}</dd>
          </div>
          <div>
            <dt>EPS</dt>
            <dd>{adultoMayor.eps ?? "Sin dato"}</dd>
          </div>
        </dl>
      </section>

      <nav className="adulto-form-tabs" aria-label="Secciones de atencion" role="tablist">
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
        id={`${tabPanelIdPrefix}-datos-panel`}
        role="tabpanel"
        aria-label="Contenido de datos de la atencion"
        hidden={activeSection !== "datos"}
      >
        <div className="adulto-form-grid">
          <AtencionFieldGroup label="Fecha" error={getError("attentionDate")}>
            <input type="date" readOnly={isReadOnly} {...form.register("attentionDate")} />
          </AtencionFieldGroup>
          <SelectField
            label="Modalidad de la consulta"
            disabled={isReadOnly}
            error={getError("modalidad")}
            registration={form.register("modalidad")}
            values={atencionIndividualModalidadValues}
            labels={MODALIDAD_LABELS}
          />
          <SelectField
            label="Tipo de consulta"
            disabled={isReadOnly}
            error={getError("tipoConsulta")}
            registration={form.register("tipoConsulta")}
            values={atencionIndividualTipoConsultaValues}
            labels={TIPO_CONSULTA_LABELS}
          />
          <AtencionFieldGroup label="Nombre de la consulta" error={getError("nombreConsulta")}>
            <input type="text" readOnly={isReadOnly} {...form.register("nombreConsulta")} />
          </AtencionFieldGroup>
          <AtencionFieldGroup label="Consecutivo" error={getError("consecutive")}>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              readOnly={isReadOnly}
              {...form.register("consecutive")}
            />
          </AtencionFieldGroup>
          <SelectField
            label="Finalidad de la Consulta"
            disabled={isReadOnly}
            error={getError("finalidad")}
            registration={form.register("finalidad")}
            values={atencionIndividualFinalidadValues}
            labels={FINALIDAD_LABELS}
          />
          <SelectField
            label="Causa Externa"
            disabled={isReadOnly}
            error={getError("causaExterna")}
            registration={form.register("causaExterna")}
            values={atencionIndividualCausaExternaValues}
            labels={CAUSA_EXTERNA_LABELS}
          />
        </div>
      </section>

      <section
        className="adulto-form-panel"
        id={`${tabPanelIdPrefix}-enfermedad-panel`}
        role="tabpanel"
        aria-label="Contenido de enfermedad actual"
        hidden={activeSection !== "enfermedad"}
      >
        <TextAreaField
          label="Motivo de consulta"
          error={getError("motivoConsulta")}
          readOnly={isReadOnly}
          registration={form.register("motivoConsulta")}
        />
        <TextAreaField
          label="Enfermedad actual"
          error={getError("enfermedadActual")}
          readOnly={isReadOnly}
          registration={form.register("enfermedadActual")}
        />
      </section>

      <section
        className="adulto-form-panel"
        id={`${tabPanelIdPrefix}-antecedentes-panel`}
        role="tabpanel"
        aria-label="Contenido de antecedentes"
        hidden={activeSection !== "antecedentes"}
      >
        <TextAreaField
          label="Antecedentes Personales"
          error={getError("antecedentesPersonales")}
          readOnly={isReadOnly}
          registration={form.register("antecedentesPersonales")}
        />
        <TextAreaField
          label="Antecedentes Familiares"
          error={getError("antecedentesFamiliares")}
          readOnly={isReadOnly}
          registration={form.register("antecedentesFamiliares")}
        />
      </section>

      <section
        className="adulto-form-panel"
        id={`${tabPanelIdPrefix}-signos-panel`}
        role="tabpanel"
        aria-label="Contenido de signos vitales"
        hidden={activeSection !== "signos"}
      >
        <div className="adulto-form-grid">
          <NumberField label="Tension sistolica" name="tensionSistolica" form={form} readOnly={isReadOnly} />
          <NumberField label="Tension diastolica" name="tensionDiastolica" form={form} readOnly={isReadOnly} />
          <NumberField label="Frecuencia cardiaca" name="frecuenciaCardiaca" form={form} readOnly={isReadOnly} />
          <NumberField label="Frecuencia respiratoria" name="frecuenciaRespiratoria" form={form} readOnly={isReadOnly} />
          <NumberField label="Temperatura" name="temperatura" form={form} readOnly={isReadOnly} />
          <NumberField label="Saturacion de oxigeno" name="saturacionOxigeno" form={form} readOnly={isReadOnly} />
          <NumberField label="Peso kg" name="pesoKg" form={form} readOnly={isReadOnly} />
          <NumberField label="Talla cm" name="tallaCm" form={form} readOnly={isReadOnly} />
          <NumberField label="IMC" name="imc" form={form} readOnly />
          <NumberField
            label="Perimetro abdominal cm"
            name="perimetroAbdominalCm"
            form={form}
            readOnly={isReadOnly}
          />
        </div>
        <TextAreaField
          label="Examen fisico"
          error={getError("examenFisico")}
          readOnly={isReadOnly}
          registration={form.register("examenFisico")}
        />
      </section>

      <section
        className="adulto-form-panel"
        id={`${tabPanelIdPrefix}-resultados-panel`}
        role="tabpanel"
        aria-label="Contenido de resultados"
        hidden={activeSection !== "resultados"}
      >
        <TextAreaField
          label="Resultados de laboratorios"
          error={getError("resultadosLaboratorios")}
          readOnly={isReadOnly}
          registration={form.register("resultadosLaboratorios")}
        />
        <TextAreaField
          label="Resultados de procedimientos"
          error={getError("resultadosProcedimientos")}
          readOnly={isReadOnly}
          registration={form.register("resultadosProcedimientos")}
        />
      </section>

      <section
        className="adulto-form-panel"
        id={`${tabPanelIdPrefix}-ordenes-panel`}
        role="tabpanel"
        aria-label="Contenido de ordenes medicas"
        hidden={activeSection !== "ordenes"}
      >
        {!isReadOnly ? (
          <button
            className="outline-action atencion-inline-action"
            type="button"
            onClick={() => ordenesFieldArray.append(createDefaultOrden())}
          >
            <Plus aria-hidden="true" />
            <span>Agregar orden</span>
          </button>
        ) : null}
        <div className="atencion-items">
          {ordenesFieldArray.fields.length === 0 ? (
            <p className="atencion-empty-note">Sin ordenes medicas agregadas.</p>
          ) : null}
          {ordenesFieldArray.fields.map((field, index) => (
            <article className="atencion-item" key={field.id}>
              <div className="adulto-form-grid">
                <SelectField
                  label="Tipo"
                  disabled={isReadOnly}
                  registration={form.register(`ordenesMedicas.${index}.tipo`)}
                  values={atencionOrdenTipoValues}
                  labels={ORDEN_TIPO_LABELS}
                />
                <AtencionFieldGroup label="Nombre">
                  <input
                    type="text"
                    readOnly={isReadOnly}
                    {...form.register(`ordenesMedicas.${index}.nombre`)}
                  />
                </AtencionFieldGroup>
                <AtencionFieldGroup label="Cantidad">
                  <input
                    type="number"
                    min="0"
                    readOnly={isReadOnly}
                    {...form.register(`ordenesMedicas.${index}.cantidad`)}
                  />
                </AtencionFieldGroup>
                <AtencionFieldGroup label="Dosis">
                  <input
                    type="text"
                    readOnly={isReadOnly}
                    {...form.register(`ordenesMedicas.${index}.dosis`)}
                  />
                </AtencionFieldGroup>
                <AtencionFieldGroup label="Duracion">
                  <input
                    type="text"
                    readOnly={isReadOnly}
                    {...form.register(`ordenesMedicas.${index}.duracion`)}
                  />
                </AtencionFieldGroup>
              </div>
              <TextAreaField
                label="Indicaciones"
                readOnly={isReadOnly}
                registration={form.register(`ordenesMedicas.${index}.indicaciones`)}
              />
              {!isReadOnly ? (
                <button
                  className="adultos-row-action"
                  type="button"
                  aria-label="Eliminar orden"
                  onClick={() => ordenesFieldArray.remove(index)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section
        className="adulto-form-panel"
        id={`${tabPanelIdPrefix}-diagnosticos-panel`}
        role="tabpanel"
        aria-label="Contenido de diagnosticos"
        hidden={activeSection !== "diagnosticos"}
      >
        {!isReadOnly ? (
          <button
            className="outline-action atencion-inline-action"
            type="button"
            onClick={() => diagnosticosFieldArray.append(createDefaultDiagnostico())}
          >
            <Plus aria-hidden="true" />
            <span>Agregar diagnostico</span>
          </button>
        ) : null}
        <div className="atencion-items">
          {diagnosticosFieldArray.fields.map((field, index) => (
            <article className="atencion-item" key={field.id}>
              <div className="adulto-form-grid">
                <Cie10AutocompleteField
                  descripcionName={`diagnosticos.${index}.descripcion`}
                  form={form}
                  index={index}
                  readOnly={isReadOnly}
                />
                <AtencionFieldGroup
                  label="Descripcion"
                  error={getArrayFieldError(form.formState.errors.diagnosticos?.[index]?.descripcion)}
                >
                  <input
                    type="text"
                    readOnly
                    {...form.register(`diagnosticos.${index}.descripcion`)}
                  />
                </AtencionFieldGroup>
                <SelectField
                  label="Tipo"
                  disabled={isReadOnly}
                  registration={form.register(`diagnosticos.${index}.tipo`)}
                  values={atencionDiagnosticoTipoValues}
                  labels={DIAGNOSTICO_TIPO_LABELS}
                />
              </div>
              {!isReadOnly ? (
                <button
                  className="adultos-row-action"
                  type="button"
                  aria-label="Eliminar diagnostico"
                  disabled={diagnosticosFieldArray.fields.length === 1}
                  onClick={() => diagnosticosFieldArray.remove(index)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section
        className="adulto-form-panel atencion-supports-panel"
        id={`${tabPanelIdPrefix}-soportes-panel`}
        role="tabpanel"
        aria-label="Contenido de soportes"
        hidden={activeSection !== "soportes"}
      >
        <div className="atencion-supports-header">
          <div>
            <span className="eyebrow">Soportes clinicos</span>
            <h3>Documentos adjuntos</h3>
            <p>Adjunta hasta 3 archivos de cualquier tipo: PDF, Word, Excel, imagenes u otros.</p>
          </div>
          {!isReadOnly ? (
            <label className="outline-action atencion-support-upload">
              <Upload aria-hidden="true" />
              <span>Adjuntar</span>
              <input
                type="file"
                multiple
                aria-label="Adjuntar soportes"
                disabled={supportItems.length >= MAX_SUPPORT_FILES}
                onChange={(event) => {
                  handleSupportFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>

        {supportUploadError !== null ? (
          <p className="form-error" role="alert">
            {supportUploadError}
          </p>
        ) : null}

        <SupportFilesList
          atencionId={props.mode === "create" ? null : props.detail.id}
          allowRemove={!isReadOnly}
          items={supportItems}
          onRemove={removeSupportItem}
        />
      </section>

      {props.mode !== "view" && props.error !== null ? (
        <p className="form-error" role="alert">
          {props.error}
        </p>
      ) : null}

      {props.mode === "view" ? (
        <div className="adulto-form-actions">
          <button className="outline-action" type="button" onClick={props.onCancel}>
            Volver
          </button>
        </div>
      ) : (
        <div className="adulto-form-actions">
          <button className="outline-action" type="button" onClick={props.onCancel}>
            Cancelar
          </button>
          <button className="primary-action" type="submit" disabled={props.isPending}>
            {props.isPending ? "Guardando..." : "Guardar atencion"}
          </button>
        </div>
      )}
    </form>
  );
}

function getArrayFieldError(message: unknown): string | undefined {
  return typeof message === "string" ? message : undefined;
}

type SupportCarouselItem =
  | { type: "stored"; file: AtencionIndividualSupportFile }
  | { type: "draft"; file: File };

function SupportFilesList({
  atencionId,
  allowRemove,
  items,
  onRemove,
}: {
  atencionId: string | null;
  allowRemove: boolean;
  items: SupportCarouselItem[];
  onRemove: (index: number) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="atencion-support-empty">
        <FileText aria-hidden="true" />
        <p>No hay soportes adjuntos.</p>
      </div>
    );
  }

  return (
    <div className="atencion-support-list" role="list" aria-label="Lista de soportes">
      {items.map((item, index) => {
        const fileName = item.type === "stored" ? item.file.originalName : item.file.name;
        const mimeType = item.type === "stored" ? item.file.mimeType : item.file.type;
        const sizeBytes = item.type === "stored" ? item.file.sizeBytes : item.file.size;
        const downloadUrl =
          item.type === "stored" && atencionId !== null
            ? buildAtencionIndividualSupportFileUrl(atencionId, item.file.id)
            : null;

        return (
          <article className="atencion-support-row" key={`${item.type}-${fileName}-${index}`} role="listitem">
            <div className="atencion-support-row__icon">
              <FileText aria-hidden="true" />
            </div>
            <div className="atencion-support-row__content">
              <strong>{fileName}</strong>
              <small>
                {item.type === "stored" ? "Guardado" : "Pendiente"} - {formatSupportMimeType(mimeType)} -{" "}
                {formatSupportFileSize(sizeBytes)}
              </small>
            </div>
            <div className="atencion-support-row__actions">
              {downloadUrl !== null ? (
                <a
                  className="adultos-row-action"
                  href={downloadUrl}
                  aria-label={`Descargar ${fileName}`}
                >
                  <Download aria-hidden="true" />
                </a>
              ) : null}
              {allowRemove ? (
                <button
                  className="adultos-row-action"
                  type="button"
                  aria-label={`Eliminar ${fileName}`}
                  onClick={() => onRemove(index)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function formatSupportMimeType(mimeType: string): string {
  return mimeType.trim() === "" ? "Archivo" : mimeType;
}

function formatSupportFileSize(sizeBytes: number): string {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (sizeBytes >= 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${sizeBytes} B`;
}

function SelectField<TValue extends string>({
  disabled = false,
  error,
  label,
  labels,
  registration,
  values,
}: {
  disabled?: boolean;
  error?: string | undefined;
  label: string;
  labels: Record<TValue, string>;
  registration: UseFormRegisterReturn;
  values: readonly TValue[];
}) {
  return (
    <AtencionFieldGroup label={label} error={error}>
      <select disabled={disabled} {...registration}>
        {values.map((value) => (
          <option key={value} value={value}>
            {labels[value]}
          </option>
        ))}
      </select>
    </AtencionFieldGroup>
  );
}

function TextAreaField({
  error,
  label,
  readOnly = false,
  registration,
}: {
  error?: string | undefined;
  label: string;
  readOnly?: boolean;
  registration: UseFormRegisterReturn;
}) {
  return (
    <AtencionFieldGroup label={label} error={error}>
      <textarea rows={5} readOnly={readOnly} {...registration} />
    </AtencionFieldGroup>
  );
}

function NumberField({
  form,
  label,
  name,
  readOnly = false,
}: {
  form: UseFormReturn<AtencionIndividualFormValues>;
  label: string;
  name: keyof AtencionIndividualFormValues;
  readOnly?: boolean;
}) {
  const message = form.formState.errors[name]?.message;

  return (
    <AtencionFieldGroup label={label} error={typeof message === "string" ? message : undefined}>
      <input
        type="number"
        step="0.01"
        inputMode="decimal"
        readOnly={readOnly}
        {...form.register(name)}
      />
    </AtencionFieldGroup>
  );
}

function findFirstSectionWithError(errors: FieldErrors<AtencionIndividualFormValues>): SectionId {
  const errorKeys = new Set(Object.keys(errors));
  const section = FORM_SECTIONS.find((candidate) =>
    candidate.fields.some((field) => errorKeys.has(field)),
  );

  return section?.id ?? "datos";
}
