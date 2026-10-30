import {
  type AuthUser,
  type CreateTrabajoSocialSessionRequest,
  type TrabajoSocialAdultoResumen,
} from "@cuidarte/contracts";
import { ClipboardPlus, ChevronLeft, ChevronRight, HandHeart } from "lucide-react";
import { useId, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { toast } from "sonner";

import { type Navigate } from "@/app/hooks/use-app-navigation";
import { formatAdultoMayorDocument } from "@/features/adultos-mayores/lib/adultos-mayores-formatters";
import {
  buildTrabajoSocialCreatePath,
  buildTrabajoSocialHistoryPath,
  getTrabajoSocialCreateAdultoIdFromPath,
  getTrabajoSocialHistoryAdultoIdFromPath,
  TRABAJO_SOCIAL_PATH,
} from "../lib/trabajo-social-paths";
import { canCreateTrabajoSocial } from "../lib/trabajo-social-permissions";
import {
  useCreateTrabajoSocialSessionMutation,
  useTrabajoSocialAdultosQuery,
  useTrabajoSocialHistoryQuery,
} from "../model/trabajo-social-queries";

type Props = { path: string; navigate: Navigate; user: AuthUser };
type FormValues = Omit<CreateTrabajoSocialSessionRequest, "adultoMayorId"> & {
  agreements: string;
  nextSessionDate: string;
};
const pageSize = 20;
const sexLabels: Record<string, string> = { female: "Femenino", male: "Masculino", other: "Otro" };

export function TrabajoSocialPage({ path, navigate, user }: Props) {
  const createId = getTrabajoSocialCreateAdultoIdFromPath(path);
  if (createId) return <Create adultoId={createId} navigate={navigate} />;
  const historyId = getTrabajoSocialHistoryAdultoIdFromPath(path);
  return historyId ? (
    <History adultoId={historyId} navigate={navigate} />
  ) : (
    <Index navigate={navigate} user={user} />
  );
}

function Index({ navigate, user }: Pick<Props, "navigate" | "user">) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = useTrabajoSocialAdultosQuery({ search: search.trim() || null, page, pageSize });
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / pageSize));
  return (
    <section className="psicologia-stack" aria-labelledby="trabajo-social-title">
      <h1 className="visually-hidden" id="trabajo-social-title">
        Atenciones de trabajo social
      </h1>
      <div className="psicologia-toolbar">
        <label>
          <span>Buscar adulto mayor</span>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Nombre, documento o teléfono"
          />
        </label>
      </div>
      {query.isError ? (
        <p className="form-error" role="alert">
          No fue posible cargar las personas.
        </p>
      ) : null}
      <Table
        adultos={query.data?.adultosMayores ?? []}
        loading={query.isLoading}
        canCreate={canCreateTrabajoSocial(user)}
        showTenant={user.role === "super_admin"}
        onHistory={(id) => navigate(buildTrabajoSocialHistoryPath(id))}
        onCreate={(id) => navigate(buildTrabajoSocialCreatePath(id))}
      />
      {totalPages > 1 ? (
        <nav className="psicologia-pagination" aria-label="Paginación">
          <button
            className="outline-action"
            type="button"
            aria-label="Página anterior"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span>{page}</span>
          <button
            className="outline-action"
            type="button"
            aria-label="Página siguiente"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </section>
  );
}

function Table({
  adultos,
  loading,
  canCreate,
  showTenant,
  onHistory,
  onCreate,
}: {
  adultos: TrabajoSocialAdultoResumen[];
  loading: boolean;
  canCreate: boolean;
  showTenant: boolean;
  onHistory: (id: string) => void;
  onCreate: (id: string) => void;
}) {
  const columns = showTenant ? 7 : 6;
  return (
    <section className="psicologia-table-wrap" aria-label="Adultos mayores para trabajo social">
      <table>
        <thead>
          <tr>
            <th>Documento</th>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Edad</th>
            <th>Sexo</th>
            {showTenant ? <th>Centro</th> : null}
            <th>
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns}>Cargando adultos mayores...</td>
            </tr>
          ) : null}
          {!loading && adultos.length === 0 ? (
            <tr>
              <td colSpan={columns}>No hay adultos mayores para el filtro actual.</td>
            </tr>
          ) : null}
          {adultos.map((adulto) => (
            <tr key={adulto.id}>
              <td>{formatAdultoMayorDocument(adulto.documentType, adulto.documentNumber)}</td>
              <td>
                <strong>{adulto.fullName}</strong>
              </td>
              <td>{adulto.phone ?? "Sin teléfono"}</td>
              <td>{adulto.age}</td>
              <td>{sexLabels[adulto.sex] ?? adulto.sex}</td>
              {showTenant ? <td>{adulto.tenantName}</td> : null}
              <td>
                <div className="psicologia-row-actions">
                  <button
                    className="psicologia-row-action psicologia-row-action--history"
                    type="button"
                    aria-label={`Historial de trabajo social de ${adulto.fullName}`}
                    data-tooltip="Historial de atenciones"
                    onClick={() => onHistory(adulto.id)}
                  >
                    <ClipboardPlus aria-hidden="true" />
                  </button>
                  {canCreate ? (
                    <button
                      className="psicologia-row-action psicologia-row-action--session"
                      type="button"
                      aria-label={`Nueva atención de trabajo social de ${adulto.fullName}`}
                      data-tooltip="Nueva atención"
                      onClick={() => onCreate(adulto.id)}
                    >
                      <HandHeart aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function AdultoSummary({ adulto }: { adulto: TrabajoSocialAdultoResumen }) {
  return (
    <section className="psicologia-summary" aria-label="Resumen del adulto mayor">
      <div>
        <span className="eyebrow">Adulto mayor</span>
        <h2>{adulto.fullName}</h2>
      </div>
      <dl>
        <div>
          <dt>Documento</dt>
          <dd>{formatAdultoMayorDocument(adulto.documentType, adulto.documentNumber)}</dd>
        </div>
        <div>
          <dt>Centro</dt>
          <dd>{adulto.tenantName}</dd>
        </div>
        <div>
          <dt>Edad</dt>
          <dd>{adulto.age}</dd>
        </div>
        <div>
          <dt>EPS</dt>
          <dd>{adulto.eps ?? "Sin dato"}</dd>
        </div>
      </dl>
    </section>
  );
}

function Create({ adultoId, navigate }: { adultoId: string; navigate: Navigate }) {
  const history = useTrabajoSocialHistoryQuery(adultoId);
  const create = useCreateTrabajoSocialSessionMutation();
  if (history.isLoading)
    return (
      <section className="psicologia-empty" aria-busy="true">
        Cargando adulto mayor...
      </section>
    );
  if (history.isError || !history.data)
    return (
      <section className="psicologia-empty">
        <p className="form-error">No fue posible cargar la persona.</p>
        <Back navigate={navigate} />
      </section>
    );
  return (
    <section className="psicologia-stack" aria-labelledby="trabajo-social-title">
      <h1 className="visually-hidden" id="trabajo-social-title">
        Nueva atención de trabajo social
      </h1>
      <Nav navigate={navigate} label="Nueva atención de trabajo social" />
      <SocialForm
        adulto={history.data.adultoMayor}
        pending={create.isPending}
        error={create.error instanceof Error ? create.error.message : null}
        onCancel={() => navigate(TRABAJO_SOCIAL_PATH)}
        onSubmit={async (value) => {
          await create.mutateAsync(value);
          navigate(buildTrabajoSocialHistoryPath(adultoId), { replace: true });
        }}
      />
    </section>
  );
}

function History({ adultoId, navigate }: { adultoId: string; navigate: Navigate }) {
  const history = useTrabajoSocialHistoryQuery(adultoId);
  if (history.isLoading)
    return (
      <section className="psicologia-empty" aria-busy="true">
        Cargando historial...
      </section>
    );
  if (history.isError || !history.data)
    return (
      <section className="psicologia-empty">
        <p className="form-error">No fue posible cargar el historial.</p>
        <Back navigate={navigate} />
      </section>
    );
  return (
    <section className="psicologia-stack" aria-labelledby="trabajo-social-title">
      <h1 className="visually-hidden" id="trabajo-social-title">
        Historial de trabajo social
      </h1>
      <Nav navigate={navigate} label="Historial de atenciones" />
      <AdultoSummary adulto={history.data.adultoMayor} />
      <section className="psicologia-history">
        <span className="eyebrow">Atenciones registradas</span>
        {history.data.sessions.length === 0 ? (
          <p>Aún no hay atenciones de trabajo social para esta persona.</p>
        ) : (
          history.data.sessions.map((session) => (
            <article key={session.id}>
              <header>
                <div>
                  <strong>
                    {new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(
                      new Date(`${session.sessionDate}T12:00:00`),
                    )}
                  </strong>
                  <span>{session.modality === "individual" ? "Individual" : "Familiar"}</span>
                </div>
                <small>{session.professional.fullName}</small>
              </header>
              <dl>
                <div>
                  <dt>Motivo</dt>
                  <dd>{session.reason}</dd>
                </div>
                <div>
                  <dt>Valoración sociofamiliar</dt>
                  <dd>{session.socialAssessment}</dd>
                </div>
                <div>
                  <dt>Intervención</dt>
                  <dd>{session.intervention}</dd>
                </div>
                {session.agreements ? (
                  <div>
                    <dt>Acuerdos y remisiones</dt>
                    <dd>{session.agreements}</dd>
                  </div>
                ) : null}
              </dl>
            </article>
          ))
        )}
      </section>
    </section>
  );
}

function Nav({ navigate, label }: { navigate: Navigate; label: string }) {
  return (
    <div className="psicologia-nav">
      <Back navigate={navigate} />
      <span>{label}</span>
    </div>
  );
}
function Back({ navigate }: { navigate: Navigate }) {
  return (
    <button className="outline-action" type="button" onClick={() => navigate(TRABAJO_SOCIAL_PATH)}>
      <ChevronLeft aria-hidden="true" />
      <span>Volver</span>
    </button>
  );
}

function SocialForm({
  adulto,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  adulto: TrabajoSocialAdultoResumen;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (value: CreateTrabajoSocialSessionRequest) => Promise<void>;
}) {
  const [active, setActive] = useState<"valoracion" | "intervencion">("valoracion");
  const id = useId();
  const { register, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: {
      sessionDate: new Date().toISOString().slice(0, 10),
      modality: "individual",
      reason: "",
      socialAssessment: "",
      intervention: "",
      agreements: "",
      nextSessionDate: "",
    },
  });
  const invalid = (errors: FieldErrors<FormValues>) =>
    setActive(
      errors.intervention || errors.agreements || errors.nextSessionDate
        ? "intervencion"
        : "valoracion",
    );
  return (
    <form
      className="psicologia-form"
      noValidate
      onSubmit={handleSubmit(async (value) => {
        await onSubmit({
          ...value,
          adultoMayorId: adulto.id,
          agreements: value.agreements || null,
          nextSessionDate: value.nextSessionDate || null,
        });
        toast.success("Atención de trabajo social registrada.");
      }, invalid)}
    >
      <AdultoSummary adulto={adulto} />
      <nav className="psicologia-tabs" role="tablist" aria-label="Secciones de la atención">
        <button
          type="button"
          role="tab"
          id={`${id}-valoracion-tab`}
          aria-selected={active === "valoracion"}
          aria-controls={`${id}-valoracion-panel`}
          className={active === "valoracion" ? "is-active" : ""}
          onClick={() => setActive("valoracion")}
        >
          Valoración
        </button>
        <button
          type="button"
          role="tab"
          id={`${id}-intervencion-tab`}
          aria-selected={active === "intervencion"}
          aria-controls={`${id}-intervencion-panel`}
          className={active === "intervencion" ? "is-active" : ""}
          onClick={() => setActive("intervencion")}
        >
          Intervención y acuerdos
        </button>
      </nav>
      <section
        className="psicologia-panel"
        hidden={active !== "valoracion"}
        role="tabpanel"
        id={`${id}-valoracion-panel`}
        aria-labelledby={`${id}-valoracion-tab`}
      >
        <div className="psicologia-grid">
          <label>
            <span>Fecha de la atención</span>
            <input type="date" {...register("sessionDate", { required: "Selecciona la fecha." })} />
          </label>
          <label>
            <span>Modalidad</span>
            <select {...register("modality")}>
              <option value="individual">Individual</option>
              <option value="familiar">Familiar</option>
            </select>
          </label>
        </div>
        <label>
          <span>Motivo de atención</span>
          <textarea
            rows={4}
            {...register("reason", { required: "Registra el motivo de atención." })}
          />
        </label>
        <label>
          <span>Valoración sociofamiliar</span>
          <textarea
            rows={7}
            {...register("socialAssessment", { required: "Registra la valoración sociofamiliar." })}
          />
        </label>
      </section>
      <section
        className="psicologia-panel"
        hidden={active !== "intervencion"}
        role="tabpanel"
        id={`${id}-intervencion-panel`}
        aria-labelledby={`${id}-intervencion-tab`}
      >
        <label>
          <span>Intervención realizada</span>
          <textarea
            rows={7}
            {...register("intervention", { required: "Registra la intervención." })}
          />
        </label>
        <label>
          <span>Acuerdos y remisiones</span>
          <textarea rows={5} {...register("agreements")} />
        </label>
        <label>
          <span>Próxima atención</span>
          <input type="date" {...register("nextSessionDate")} />
        </label>
      </section>
      {Object.keys(formState.errors).length > 0 ? (
        <p className="field-error" role="alert">
          Revisa los campos requeridos.
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <footer className="psicologia-actions">
        <button className="outline-action" type="button" onClick={onCancel} disabled={pending}>
          Cancelar
        </button>
        <button className="primary-action" type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Registrar atención"}
        </button>
      </footer>
    </form>
  );
}
