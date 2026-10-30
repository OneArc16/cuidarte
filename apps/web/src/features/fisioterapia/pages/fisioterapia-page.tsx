import {
  type AuthUser,
  type CreateFisioterapiaSessionRequest,
  type FisioterapiaAdultoResumen,
} from "@cuidarte/contracts";
import { ClipboardPlus, ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { useId, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import { type Navigate } from "@/app/hooks/use-app-navigation";
import { formatAdultoMayorDocument } from "@/features/adultos-mayores/lib/adultos-mayores-formatters";
import {
  buildFisioterapiaCreatePath,
  buildFisioterapiaHistoryPath,
  FISIOTERAPIA_PATH,
  getFisioterapiaCreateAdultoIdFromPath,
  getFisioterapiaHistoryAdultoIdFromPath,
} from "../lib/fisioterapia-paths";
import { canCreateFisioterapia } from "../lib/fisioterapia-permissions";
import {
  useCreateFisioterapiaSessionMutation,
  useFisioterapiaAdultosQuery,
  useFisioterapiaHistoryQuery,
} from "../model/fisioterapia-queries";

type Props = { path: string; navigate: Navigate; user: AuthUser };
const pageSize = 20;
const sexLabels: Record<string, string> = { female: "Femenino", male: "Masculino", other: "Otro" };
export function FisioterapiaPage({ path, navigate, user }: Props) {
  const createId = getFisioterapiaCreateAdultoIdFromPath(path);
  if (createId) return <Create adultoId={createId} navigate={navigate} />;
  const historyId = getFisioterapiaHistoryAdultoIdFromPath(path);
  return historyId ? (
    <History adultoId={historyId} navigate={navigate} />
  ) : (
    <Index navigate={navigate} user={user} />
  );
}
function Index({ navigate, user }: { navigate: Navigate; user: AuthUser }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = useFisioterapiaAdultosQuery({ search: search.trim() || null, page, pageSize });
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / pageSize));
  return (
    <section className="fisioterapia-stack" aria-labelledby="fisioterapia-title">
      <h1 id="fisioterapia-title" className="visually-hidden">
        Atenciones de fisioterapia
      </h1>
      <label className="fisioterapia-search">
        <span>Buscar adulto mayor</span>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Nombre, documento o teléfono"
        />
      </label>
      {query.isError ? (
        <p className="form-error" role="alert">
          No fue posible cargar las personas.
        </p>
      ) : null}
      <AdultosTable
        adultos={query.data?.adultosMayores ?? []}
        loading={query.isLoading}
        canCreate={canCreateFisioterapia(user)}
        showTenant={user.role === "super_admin"}
        onHistory={(id) => navigate(buildFisioterapiaHistoryPath(id))}
        onCreate={(id) => navigate(buildFisioterapiaCreatePath(id))}
      />
      {totalPages > 1 ? (
        <nav className="fisioterapia-pagination">
          <button
            className="outline-action"
            type="button"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft />
          </button>
          <span>{page}</span>
          <button
            className="outline-action"
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            aria-label="Página siguiente"
          >
            <ChevronRight />
          </button>
        </nav>
      ) : null}
    </section>
  );
}
function AdultosTable({
  adultos,
  loading,
  canCreate,
  showTenant,
  onHistory,
  onCreate,
}: {
  adultos: FisioterapiaAdultoResumen[];
  loading: boolean;
  canCreate: boolean;
  showTenant: boolean;
  onHistory: (id: string) => void;
  onCreate: (id: string) => void;
}) {
  const columns = showTenant ? 7 : 6;
  return (
    <section className="fisioterapia-table-wrap" aria-label="Adultos mayores para fisioterapia">
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
                <div className="fisioterapia-row-actions">
                  <button
                    className="fisioterapia-row-action fisioterapia-row-action--history"
                    type="button"
                    onClick={() => onHistory(adulto.id)}
                    aria-label={`Historial de fisioterapia de ${adulto.fullName}`}
                    data-tooltip="Historial de atenciones"
                  >
                    <ClipboardPlus />
                  </button>
                  {canCreate ? (
                    <button
                      className="fisioterapia-row-action fisioterapia-row-action--session"
                      type="button"
                      onClick={() => onCreate(adulto.id)}
                      aria-label={`Nueva atención de fisioterapia de ${adulto.fullName}`}
                      data-tooltip="Nueva atención de fisioterapia"
                    >
                      <Dumbbell />
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
function Summary({ adulto }: { adulto: FisioterapiaAdultoResumen }) {
  return (
    <section className="fisioterapia-summary" aria-label="Resumen del adulto mayor">
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
  const history = useFisioterapiaHistoryQuery(adultoId);
  const create = useCreateFisioterapiaSessionMutation();
  if (history.isLoading)
    return <section className="fisioterapia-empty">Cargando adulto mayor...</section>;
  if (!history.data)
    return (
      <section className="fisioterapia-empty">
        <p className="form-error">No fue posible cargar la persona.</p>
      </section>
    );
  return (
    <section className="fisioterapia-stack" aria-labelledby="fisioterapia-title">
      <h1 id="fisioterapia-title" className="visually-hidden">
        Nueva atención de fisioterapia
      </h1>
      <Nav navigate={navigate} label="Nueva atención de fisioterapia" />
      <SessionForm
        adulto={history.data.adultoMayor}
        pending={create.isPending}
        error={create.error instanceof Error ? create.error.message : null}
        onCancel={() => navigate(FISIOTERAPIA_PATH)}
        onSubmit={async (value) => {
          await create.mutateAsync(value);
          navigate(buildFisioterapiaHistoryPath(adultoId), { replace: true });
        }}
      />
    </section>
  );
}
function History({ adultoId, navigate }: { adultoId: string; navigate: Navigate }) {
  const history = useFisioterapiaHistoryQuery(adultoId);
  if (history.isLoading)
    return <section className="fisioterapia-empty">Cargando historial...</section>;
  if (!history.data)
    return (
      <section className="fisioterapia-empty">
        <p className="form-error">No fue posible cargar el historial.</p>
      </section>
    );
  return (
    <section className="fisioterapia-stack" aria-labelledby="fisioterapia-title">
      <h1 id="fisioterapia-title" className="visually-hidden">
        Historial de fisioterapia
      </h1>
      <Nav navigate={navigate} label="Historial de atenciones" />
      <Summary adulto={history.data.adultoMayor} />
      <section className="fisioterapia-history">
        <span className="eyebrow">Atenciones registradas</span>
        {history.data.sessions.length === 0 ? (
          <p>Aún no hay atenciones de fisioterapia para esta persona.</p>
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
                  <span>
                    {session.modality === "individual"
                      ? "Individual"
                      : session.modality === "grupal"
                        ? "Grupal"
                        : "Domiciliaria"}
                  </span>
                </div>
                <small>{session.professional.fullName}</small>
              </header>
              <dl>
                <div>
                  <dt>Motivo</dt>
                  <dd>{session.reason}</dd>
                </div>
                <div>
                  <dt>Valoración funcional</dt>
                  <dd>{session.functionalAssessment}</dd>
                </div>
                <div>
                  <dt>Intervención</dt>
                  <dd>{session.intervention}</dd>
                </div>
                {session.evolution ? (
                  <div>
                    <dt>Evolución</dt>
                    <dd>{session.evolution}</dd>
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
    <div className="fisioterapia-nav">
      <button className="outline-action" type="button" onClick={() => navigate(FISIOTERAPIA_PATH)}>
        <ChevronLeft />
        <span>Volver</span>
      </button>
      <span>{label}</span>
    </div>
  );
}
type Values = Omit<CreateFisioterapiaSessionRequest, "adultoMayorId"> & {
  evolution: string;
  nextSessionDate: string;
};
function SessionForm({
  adulto,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  adulto: FisioterapiaAdultoResumen;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (value: CreateFisioterapiaSessionRequest) => Promise<void>;
}) {
  const [active, setActive] = useState<"valoracion" | "intervencion">("valoracion");
  const id = useId();
  const { register, handleSubmit, formState } = useForm<Values>({
    defaultValues: {
      sessionDate: new Date().toISOString().slice(0, 10),
      modality: "individual",
      reason: "",
      functionalAssessment: "",
      intervention: "",
      evolution: "",
      nextSessionDate: "",
    },
  });
  const invalid = (errors: FieldErrors<Values>) =>
    setActive(
      errors.intervention || errors.evolution || errors.nextSessionDate
        ? "intervencion"
        : "valoracion",
    );
  return (
    <form
      className="fisioterapia-form"
      noValidate
      onSubmit={handleSubmit(async (value) => {
        await onSubmit({
          ...value,
          adultoMayorId: adulto.id,
          evolution: value.evolution || null,
          nextSessionDate: value.nextSessionDate || null,
        });
        toast.success("Atención de fisioterapia registrada.");
      }, invalid)}
    >
      <Summary adulto={adulto} />
      <nav className="fisioterapia-tabs" role="tablist">
        {(
          [
            ["valoracion", "Valoración funcional"],
            ["intervencion", "Intervención y evolución"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`${id}-${tab}-tab`}
            aria-selected={active === tab}
            aria-controls={`${id}-${tab}-panel`}
            className={active === tab ? "is-active" : ""}
            onClick={() => setActive(tab)}
          >
            {label}
          </button>
        ))}
      </nav>
      <section
        className="fisioterapia-panel"
        hidden={active !== "valoracion"}
        role="tabpanel"
        id={`${id}-valoracion-panel`}
        aria-labelledby={`${id}-valoracion-tab`}
      >
        <div className="fisioterapia-grid">
          <label>
            <span>Fecha de la sesión</span>
            <input type="date" {...register("sessionDate", { required: true })} />
          </label>
          <label>
            <span>Modalidad</span>
            <select {...register("modality")}>
              <option value="individual">Individual</option>
              <option value="grupal">Grupal</option>
              <option value="domiciliaria">Domiciliaria</option>
            </select>
          </label>
        </div>
        <label>
          <span>Motivo de consulta</span>
          <textarea rows={4} {...register("reason", { required: true })} />
        </label>
        <label>
          <span>Valoración funcional</span>
          <textarea rows={7} {...register("functionalAssessment", { required: true })} />
        </label>
      </section>
      <section
        className="fisioterapia-panel"
        hidden={active !== "intervencion"}
        role="tabpanel"
        id={`${id}-intervencion-panel`}
        aria-labelledby={`${id}-intervencion-tab`}
      >
        <label>
          <span>Intervención realizada</span>
          <textarea rows={7} {...register("intervention", { required: true })} />
        </label>
        <label>
          <span>Evolución y recomendaciones</span>
          <textarea rows={5} {...register("evolution")} />
        </label>
        <label>
          <span>Próxima sesión</span>
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
      <footer className="fisioterapia-actions">
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
