import {
  type ActividadGrupalDiligenciamientoDetail,
  type ActividadGrupalIntegranteOption,
  type SaveActividadGrupalDiligenciamiento,
} from "@cuidarte/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ImagePlus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";

import { formatEmpleadoRole } from "@/features/empleados/lib/empleados-formatters";

import { buildActividadGrupalDiligenciamientoFileUrl } from "../api/actividades-grupales-api";
import {
  formatActividadGrupalFileSize,
  formatActividadGrupalOrganizer,
  formatActividadGrupalResponsibleDepartment,
  formatActividadGrupalType,
  formatActivitySchedule,
  formatActaNumber,
  getActividadGrupalResponsibleDepartmentOptions,
  resolveActividadesGrupalesApiError,
} from "../lib/actividades-grupales-formatters";
import { useActividadGrupalIntegranteOptionsQuery } from "../model/actividades-grupales-queries";
import {
  type ActividadGrupalDiligenciamientoFormValues,
  actividadGrupalDiligenciamientoFormSchema,
  createActividadGrupalDiligenciamientoFormValues,
  toSaveActividadGrupalDiligenciamiento,
} from "../schemas/actividad-grupal-diligenciamiento-form.schema";
import { ActividadGrupalFieldGroup } from "./actividad-grupal-field-group";

const MAX_SUPPORT_PHOTOS = 5;
const MAX_PHOTO_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ExistingPhotoSlide = {
  id: string;
  key: string;
  kind: "existing";
  sizeLabel: string;
  src: string;
  title: string;
};

type DraftPhotoSlide = {
  file: File;
  key: string;
  kind: "draft";
  sizeLabel: string;
  src: string;
  title: string;
};

type PhotoSlide = ExistingPhotoSlide | DraftPhotoSlide;

type ActividadGrupalDiligenciamientoFormProps = {
  activityId: string;
  detail: ActividadGrupalDiligenciamientoDetail;
  error: string | null;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (request: {
    payload: SaveActividadGrupalDiligenciamiento;
    newPhotos: File[];
    newPdf: File | null;
  }) => void;
};

export function ActividadGrupalDiligenciamientoForm({
  activityId,
  detail,
  error,
  isPending,
  onCancel,
  onSubmit,
}: ActividadGrupalDiligenciamientoFormProps) {
  const form = useForm<ActividadGrupalDiligenciamientoFormValues>({
    resolver: zodResolver(
      actividadGrupalDiligenciamientoFormSchema,
    ) as Resolver<ActividadGrupalDiligenciamientoFormValues>,
    defaultValues: createActividadGrupalDiligenciamientoFormValues(detail),
    mode: "onBlur",
  });
  const [integranteSearch, setIntegranteSearch] = useState("");
  const [selectedIntegrantes, setSelectedIntegrantes] = useState(detail.integrantes);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [newPdfFile, setNewPdfFile] = useState<File | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const deferredIntegranteSearch = useDeferredValue(integranteSearch.trim());
  const hasIntegranteSearch = deferredIntegranteSearch !== "";
  const integranteOptionsQuery = useActividadGrupalIntegranteOptionsQuery(
    activityId,
    deferredIntegranteSearch,
    hasIntegranteSearch,
  );
  const removedPhotoFileIds = form.watch("removedPhotoFileIds");
  const removePdfFile = form.watch("removePdfFile");

  useEffect(() => {
    form.reset(createActividadGrupalDiligenciamientoFormValues(detail));
    setSelectedIntegrantes(detail.integrantes);
    setIntegranteSearch("");
    setNewPhotoFiles([]);
    setNewPdfFile(null);
    setActivePhotoIndex(0);
    setPhotoUploadError(null);
    setPdfUploadError(null);
  }, [detail, form]);

  useEffect(() => {
    form.setValue(
      "integranteIds",
      selectedIntegrantes.map((integrante) => integrante.id),
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      },
    );
  }, [form, selectedIntegrantes]);

  const newPhotoPreviews = useMemo(
    () =>
      newPhotoFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [newPhotoFiles],
  );

  useEffect(() => {
    return () => {
      for (const preview of newPhotoPreviews) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [newPhotoPreviews]);

  const visibleExistingPhotos = detail.photoFiles.filter(
    (file) => !removedPhotoFileIds.includes(file.id),
  );
  const photoSlides = useMemo<PhotoSlide[]>(
    () => [
      ...visibleExistingPhotos.map((photo) => ({
        id: photo.id,
        key: photo.id,
        kind: "existing" as const,
        sizeLabel: formatActividadGrupalFileSize(photo.sizeBytes),
        src: buildActividadGrupalDiligenciamientoFileUrl(activityId, photo.id),
        title: photo.originalName,
      })),
      ...newPhotoPreviews.map((photo) => ({
        file: photo.file,
        key: `${photo.file.name}-${photo.file.lastModified}`,
        kind: "draft" as const,
        sizeLabel: formatActividadGrupalFileSize(photo.file.size),
        src: photo.url,
        title: photo.file.name,
      })),
    ],
    [activityId, newPhotoPreviews, visibleExistingPhotos],
  );
  const integranteOptions = (integranteOptionsQuery.data?.integrantes ?? []).filter(
    (integrante) => !selectedIntegrantes.some((selected) => selected.id === integrante.id),
  );
  const visiblePdfFile = newPdfFile !== null ? null : removePdfFile ? null : detail.pdfFile;

  useEffect(() => {
    setActivePhotoIndex((current) => {
      if (photoSlides.length === 0) {
        return 0;
      }

      return current >= photoSlides.length ? photoSlides.length - 1 : current;
    });
  }, [photoSlides.length]);

  function getError(field: keyof ActividadGrupalDiligenciamientoFormValues): string | undefined {
    const message = form.formState.errors[field]?.message;

    return typeof message === "string" ? message : undefined;
  }

  function addIntegrante(integrante: ActividadGrupalIntegranteOption) {
    setSelectedIntegrantes((current) =>
      current.some((item) => item.id === integrante.id) ? current : [...current, integrante],
    );
    setIntegranteSearch("");
  }

  function removeIntegrante(integranteId: string) {
    setSelectedIntegrantes((current) => current.filter((item) => item.id !== integranteId));
  }

  function removeDraftPhoto(targetFile: File) {
    setNewPhotoFiles((current) => current.filter((file) => file !== targetFile));
  }

  function toggleExistingPhoto(photoId: string) {
    const nextRemovedIds = removedPhotoFileIds.includes(photoId)
      ? removedPhotoFileIds.filter((fileId) => fileId !== photoId)
      : [...removedPhotoFileIds, photoId];

    form.setValue("removedPhotoFileIds", nextRemovedIds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function handleNewPhotos(files: FileList | null) {
    if (files === null || files.length === 0) {
      return;
    }

    setPhotoUploadError(null);

    const allowedSlots = MAX_SUPPORT_PHOTOS - visibleExistingPhotos.length - newPhotoFiles.length;

    if (allowedSlots <= 0) {
      setPhotoUploadError("Ya tienes el maximo de 5 fotos de soporte.");
      return;
    }

    const nextValidFiles: File[] = [];

    for (const file of Array.from(files)) {
      if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
        setPhotoUploadError("Solo se permiten fotos JPG, PNG o WEBP.");
        continue;
      }

      if (file.size > MAX_PHOTO_FILE_SIZE_BYTES) {
        setPhotoUploadError("Cada foto debe pesar maximo 5 MB.");
        continue;
      }

      nextValidFiles.push(file);
    }

    if (nextValidFiles.length > allowedSlots) {
      setPhotoUploadError("Solo puedes conservar 5 fotos en total.");
    }

    setNewPhotoFiles((current) => [...current, ...nextValidFiles.slice(0, allowedSlots)]);
  }

  function handlePdf(fileList: FileList | null) {
    if (fileList === null || fileList.length === 0) {
      return;
    }

    const file = fileList[0];
    setPdfUploadError(null);

    if (file === undefined) {
      return;
    }

    if (file.type !== "application/pdf") {
      setPdfUploadError("El soporte debe estar en formato PDF.");
      return;
    }

    if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
      setPdfUploadError("El PDF de soporte debe pesar maximo 10 MB.");
      return;
    }

    setNewPdfFile(file);
    form.setValue("removePdfFile", false, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  return (
    <form
      className="actividad-form actividad-diligenciamiento-form"
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          if (values.responsibleDepartment === "") {
            form.setError("responsibleDepartment", {
              type: "manual",
              message: "Selecciona el departamento encargado.",
            });
            return;
          }

          onSubmit({
            payload: toSaveActividadGrupalDiligenciamiento(values),
            newPhotos: newPhotoFiles,
            newPdf: newPdfFile,
          });
        })(event);
      }}
    >
      <section className="actividad-diligenciamiento-shell">
        <aside className="actividad-form-summary actividad-diligenciamiento-summary">
          <div className="actividad-form-summary__acta">
            <span className="eyebrow">Acta</span>
            <strong>{formatActaNumber(detail.actaNumber)}</strong>
            <small>La planeacion queda fija y aqui registras su ejecucion.</small>
          </div>

          <div className="actividad-form-summary__note">
            <ShieldCheck aria-hidden="true" />
            <p>
              Completa objetivos, desarrollo, conclusion y soportes para dejar la sesion documentada
              en un solo flujo.
            </p>
          </div>

          <div className="actividad-diligenciamiento-summary__professionals">
            <span className="eyebrow">Profesionales asignados</span>
            <div className="actividad-diligenciamiento-pills">
              {detail.assignedProfessionals.map((professional) => (
                <span key={professional.id} className="actividad-diligenciamiento-pill">
                  <strong>{professional.fullName}</strong>
                  <small>{formatEmpleadoRole(professional.role)}</small>
                </span>
              ))}
            </div>
          </div>
        </aside>

        <section className="actividad-form-panel actividad-diligenciamiento-panel">
          <div className="actividad-diligenciamiento-readonly-grid">
            <ReadOnlyField label="Actividad" value={detail.activityName} isWide />
            <ReadOnlyField
              label="Tipo de actividad"
              value={formatActividadGrupalType(detail.activityType)}
            />
            <ReadOnlyField label="Fecha" value={detail.activityDate} />
            <ReadOnlyField
              label="Horario"
              value={formatActivitySchedule(detail.startTime, detail.endTime)}
            />
            <ReadOnlyField
              label="Organizador"
              value={formatActividadGrupalOrganizer(detail.organizer)}
            />
          </div>

          <div className="actividad-form-grid actividad-diligenciamiento-text-grid">
            <ActividadGrupalFieldGroup label="Objetivos" error={getError("objectives")}>
              <textarea
                rows={5}
                aria-invalid={getError("objectives") === undefined ? "false" : "true"}
                {...form.register("objectives")}
              />
            </ActividadGrupalFieldGroup>

            <ActividadGrupalFieldGroup
              label="Departamento encargado"
              error={getError("responsibleDepartment")}
            >
              <select
                aria-invalid={getError("responsibleDepartment") === undefined ? "false" : "true"}
                {...form.register("responsibleDepartment")}
              >
                <option value="">Seleccionar</option>
                {getActividadGrupalResponsibleDepartmentOptions().map((option) => (
                  <option key={option} value={option}>
                    {formatActividadGrupalResponsibleDepartment(option)}
                  </option>
                ))}
              </select>
            </ActividadGrupalFieldGroup>

            <ActividadGrupalFieldGroup label="Desarrollo" error={getError("development")}>
              <textarea
                rows={8}
                aria-invalid={getError("development") === undefined ? "false" : "true"}
                {...form.register("development")}
              />
            </ActividadGrupalFieldGroup>

            <ActividadGrupalFieldGroup label="Conclusion" error={getError("conclusion")}>
              <textarea
                rows={8}
                aria-invalid={getError("conclusion") === undefined ? "false" : "true"}
                {...form.register("conclusion")}
              />
            </ActividadGrupalFieldGroup>
          </div>
        </section>
      </section>

      <section className="actividad-form-panel actividad-diligenciamiento-members">
        <div className="actividad-form-panel__header">
          <div>
            <h2>Agregar integrantes</h2>
            <p className="muted-copy">
              Busca adultos mayores del centro y vincula los que participaron en la sesion.
            </p>
          </div>
          <span>{selectedIntegrantes.length} asignados</span>
        </div>

        <label className="actividad-empleados-search actividad-diligenciamiento-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={integranteSearch}
            aria-label="Buscar por nombre o documento"
            placeholder="Buscar por nombre o documento"
            onChange={(event) => setIntegranteSearch(event.target.value)}
          />
        </label>

        {integranteOptionsQuery.isError ? (
          <p className="form-error" role="alert">
            {resolveActividadesGrupalesApiError(integranteOptionsQuery.error)}
          </p>
        ) : null}

        {!hasIntegranteSearch ? (
          <div className="actividad-empleados-empty">
            <p>Escribe un nombre o documento para buscar adultos mayores.</p>
          </div>
        ) : integranteOptionsQuery.isFetching ? (
          <div className="actividad-empleados-empty" aria-live="polite">
            <p>Buscando adultos mayores...</p>
          </div>
        ) : integranteOptions.length === 0 ? (
          <div className="actividad-empleados-empty">
            <p>No encontramos adultos mayores con ese criterio.</p>
          </div>
        ) : (
          <div className="actividad-diligenciamiento-suggestions">
            {integranteOptions.map((integrante) => (
              <button
                key={integrante.id}
                className="actividad-diligenciamiento-suggestion"
                type="button"
                onClick={() => addIntegrante(integrante)}
              >
                <UsersRound aria-hidden="true" />
                <strong>{integrante.fullName}</strong>
                <small>{integrante.documentNumber}</small>
              </button>
            ))}
          </div>
        )}

        <ActividadGrupalFieldGroup
          label="Integrantes seleccionados"
          error={getError("integranteIds")}
        >
          <div className="actividad-diligenciamiento-selected">
            {selectedIntegrantes.length === 0 ? (
              <div className="actividad-empleados-empty">
                <p>Agrega minimo un adulto mayor para guardar el diligenciamiento.</p>
              </div>
            ) : (
              <div className="actividad-diligenciamiento-selected-list">
                {selectedIntegrantes.map((integrante) => (
                  <button
                    key={integrante.id}
                    className="actividad-diligenciamiento-chip"
                    type="button"
                    onClick={() => removeIntegrante(integrante.id)}
                  >
                    <span>
                      <strong>{integrante.fullName}</strong>
                      <small>{integrante.documentNumber}</small>
                    </span>
                    <X aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </ActividadGrupalFieldGroup>
      </section>

      <section className="actividad-form-panel actividad-diligenciamiento-files">
        <div className="actividad-form-panel__header">
          <div>
            <h2>Soportes</h2>
            <p className="muted-copy">
              Adjunta hasta 5 fotos y un PDF de soporte para completar el registro de la sesion.
            </p>
          </div>
          <span>Fotos + PDF</span>
        </div>

        <div className="actividad-diligenciamiento-files-grid">
          <div className="actividad-diligenciamiento-upload-card">
            <div className="actividad-diligenciamiento-upload-card__header">
              <ImagePlus aria-hidden="true" />
              <div>
                <strong>Fotos de soporte</strong>
                <small>Maximo 5 imagenes JPG, PNG o WEBP de hasta 5 MB.</small>
              </div>
            </div>

            <label className="outline-action actividad-diligenciamiento-upload-button">
              <Upload aria-hidden="true" />
              <span>Agregar fotos</span>
              <input
                className="visually-hidden"
                type="file"
                aria-label="Agregar fotos de soporte"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => {
                  handleNewPhotos(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>

            {photoUploadError !== null ? (
              <p className="form-error" role="alert">
                {photoUploadError}
              </p>
            ) : null}

            <PhotoCarousel
              activeIndex={activePhotoIndex}
              slides={photoSlides}
              onChange={setActivePhotoIndex}
              onRemoveSlide={(slide) => {
                if (slide.kind === "existing") {
                  toggleExistingPhoto(slide.id);
                  return;
                }

                removeDraftPhoto(slide.file);
              }}
            />
          </div>

          <div className="actividad-diligenciamiento-upload-card">
            <div className="actividad-diligenciamiento-upload-card__header">
              <FileText aria-hidden="true" />
              <div>
                <strong>Documento PDF</strong>
                <small>Adjunta un PDF de soporte de hasta 10 MB.</small>
              </div>
            </div>

            <label className="outline-action actividad-diligenciamiento-upload-button">
              <Upload aria-hidden="true" />
              <span>{newPdfFile === null ? "Adjuntar PDF" : "Reemplazar PDF"}</span>
              <input
                className="visually-hidden"
                type="file"
                aria-label="Adjuntar documento PDF"
                accept="application/pdf"
                onChange={(event) => {
                  handlePdf(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>

            {pdfUploadError !== null ? (
              <p className="form-error" role="alert">
                {pdfUploadError}
              </p>
            ) : null}

            {visiblePdfFile !== null ? (
              <FileCard
                actionLabel="Retirar PDF actual"
                actionIcon={<Trash2 aria-hidden="true" />}
                description={formatActividadGrupalFileSize(visiblePdfFile.sizeBytes)}
                href={buildActividadGrupalDiligenciamientoFileUrl(activityId, visiblePdfFile.id)}
                title={visiblePdfFile.originalName}
                onAction={() =>
                  form.setValue("removePdfFile", true, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
              />
            ) : null}

            {newPdfFile !== null ? (
              <FileCard
                actionLabel="Quitar PDF nuevo"
                actionIcon={<X aria-hidden="true" />}
                description={formatActividadGrupalFileSize(newPdfFile.size)}
                title={newPdfFile.name}
                onAction={() => setNewPdfFile(null)}
              />
            ) : null}
          </div>
        </div>
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
          {isPending ? "Guardando..." : "Guardar diligenciamiento"}
        </button>
      </div>
    </form>
  );
}

function ReadOnlyField({
  label,
  value,
  isWide = false,
}: {
  label: string;
  value: string;
  isWide?: boolean;
}) {
  return (
    <div
      className={`actividad-diligenciamiento-readonly-field${isWide ? " actividad-diligenciamiento-readonly-field--wide" : ""}`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FileCard({
  actionIcon,
  actionLabel,
  description,
  href,
  onAction,
  title,
}: {
  actionIcon: React.ReactNode;
  actionLabel: string;
  description: string;
  href?: string;
  onAction: () => void;
  title: string;
}) {
  return (
    <article className="actividad-diligenciamiento-file-card">
      <div className="actividad-diligenciamiento-file-card__content">
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
      <div className="actividad-diligenciamiento-file-card__actions">
        {href !== undefined ? (
          <a
            className="actividades-row-action"
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Abrir ${title}`}
            title="Abrir soporte"
          >
            <Download aria-hidden="true" />
          </a>
        ) : null}
        <button
          className="actividades-row-action"
          type="button"
          aria-label={actionLabel}
          title={actionLabel}
          onClick={onAction}
        >
          {actionIcon}
        </button>
      </div>
    </article>
  );
}

function PhotoCarousel({
  activeIndex,
  slides,
  onChange,
  onRemoveSlide,
}: {
  activeIndex: number;
  slides: PhotoSlide[];
  onChange: (nextIndex: number) => void;
  onRemoveSlide: (slide: PhotoSlide) => void;
}) {
  if (slides.length === 0) {
    return (
      <div className="actividad-diligenciamiento-photo-carousel actividad-empleados-empty">
        <p>Agrega fotos para verlas en carrusel y revisar cada soporte con mas claridad.</p>
      </div>
    );
  }

  const safeIndex = activeIndex >= slides.length ? slides.length - 1 : activeIndex;
  const activeSlide = slides[safeIndex] ?? slides[0];

  if (activeSlide === undefined) {
    return null;
  }

  const canNavigate = slides.length > 1;

  return (
    <div className="actividad-diligenciamiento-photo-carousel">
      <div className="actividad-diligenciamiento-photo-carousel__stage">
        <button
          className="actividad-diligenciamiento-photo-carousel__nav"
          type="button"
          aria-label="Ver foto anterior"
          disabled={!canNavigate}
          onClick={() => onChange((safeIndex - 1 + slides.length) % slides.length)}
        >
          <ChevronLeft aria-hidden="true" />
        </button>

        <figure
          className={`actividad-diligenciamiento-photo-carousel__figure${activeSlide.kind === "draft" ? " actividad-diligenciamiento-photo-carousel__figure--draft" : ""}`}
        >
          <span className="actividad-diligenciamiento-photo-carousel__badge">
            {activeSlide.kind === "draft" ? "Nueva" : "Guardada"}
          </span>
          <img src={activeSlide.src} alt={activeSlide.title} loading="lazy" />
        </figure>

        <button
          className="actividad-diligenciamiento-photo-carousel__nav"
          type="button"
          aria-label="Ver foto siguiente"
          disabled={!canNavigate}
          onClick={() => onChange((safeIndex + 1) % slides.length)}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <div className="actividad-diligenciamiento-photo-carousel__meta">
        <div className="actividad-diligenciamiento-photo-carousel__copy">
          <strong>{activeSlide.title}</strong>
          <small>{activeSlide.sizeLabel}</small>
        </div>

        <div className="actividad-diligenciamiento-photo-carousel__actions">
          <span className="actividad-diligenciamiento-photo-carousel__counter">
            {safeIndex + 1} / {slides.length}
          </span>
          <button
            className="actividades-row-action"
            type="button"
            aria-label={
              activeSlide.kind === "draft"
                ? `Quitar foto nueva ${activeSlide.title}`
                : `Retirar foto ${activeSlide.title}`
            }
            onClick={() => onRemoveSlide(activeSlide)}
          >
            {activeSlide.kind === "draft" ? (
              <X aria-hidden="true" />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="actividad-diligenciamiento-photo-carousel__thumbnails" role="list">
        {slides.map((slide, index) => (
          <button
            key={slide.key}
            className={`actividad-diligenciamiento-photo-carousel__thumbnail${index === safeIndex ? " actividad-diligenciamiento-photo-carousel__thumbnail--active" : ""}`}
            type="button"
            aria-label={`Ver foto ${index + 1}: ${slide.title}`}
            aria-pressed={index === safeIndex}
            onClick={() => onChange(index)}
          >
            <img src={slide.src} alt="" loading="lazy" />
            <span>{slide.kind === "draft" ? "Nueva" : `Foto ${index + 1}`}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
