import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { type Navigate } from "@/app/hooks/use-app-navigation";
import { PsicologiaAdultosTable } from "../components/psicologia-adultos-table";
import { PsicologiaAdultoSummary } from "../components/psicologia-adulto-summary";
import { PsicologiaSessionForm } from "../components/psicologia-session-form";
import {
  buildPsicologiaCreatePath,
  buildPsicologiaHistoryPath,
  getPsicologiaCreateAdultoIdFromPath,
  getPsicologiaHistoryAdultoIdFromPath,
  PSICOLOGIA_PATH,
} from "../lib/psicologia-paths";
import { canCreatePsicologia } from "../lib/psicologia-permissions";
import {
  useCreatePsicologiaSessionMutation,
  usePsicologiaAdultosQuery,
  usePsicologiaHistoryQuery,
} from "../model/psicologia-queries";
type Props = { path: string; navigate: Navigate; user: AuthUser };
const pageSize = 20;
export function PsicologiaPage({ path, navigate, user }: Props) {
  const createId = getPsicologiaCreateAdultoIdFromPath(path);
  if (createId) return <PsicologiaCreatePage adultoId={createId} navigate={navigate} />;
  const historyId = getPsicologiaHistoryAdultoIdFromPath(path);
  if (historyId) return <PsicologiaHistoryPage adultoId={historyId} navigate={navigate} />;
  return <PsicologiaIndexPage navigate={navigate} user={user} />;
}
function PsicologiaIndexPage({ navigate, user }: { navigate: Navigate; user: AuthUser }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = usePsicologiaAdultosQuery({ search: search.trim() || null, page, pageSize });
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / pageSize));
  return (
    <section className="psicologia-stack" aria-labelledby="psicologia-title">
      <h1 className="visually-hidden" id="psicologia-title">
        Sesiones de psicología
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
      <PsicologiaAdultosTable
        adultos={query.data?.adultosMayores ?? []}
        loading={query.isLoading}
        canCreate={canCreatePsicologia(user)}
        showTenant={user.role === "super_admin"}
        onHistory={(id) => navigate(buildPsicologiaHistoryPath(id))}
        onCreate={(id) => navigate(buildPsicologiaCreatePath(id))}
      />
      {totalPages > 1 ? (
        <nav className="psicologia-pagination">
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
function PsicologiaCreatePage({ adultoId, navigate }: { adultoId: string; navigate: Navigate }) {
  const history = usePsicologiaHistoryQuery(adultoId);
  const create = useCreatePsicologiaSessionMutation();
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
        <button className="outline-action" type="button" onClick={() => navigate(PSICOLOGIA_PATH)}>
          Volver
        </button>
      </section>
    );
  return (
    <section className="psicologia-stack" aria-labelledby="psicologia-title">
      <h1 className="visually-hidden" id="psicologia-title">
        Nueva sesión de psicología
      </h1>
      <div className="psicologia-nav">
        <button className="outline-action" type="button" onClick={() => navigate(PSICOLOGIA_PATH)}>
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <span>Nueva sesión de psicología</span>
      </div>
      <PsicologiaSessionForm
        adulto={history.data.adultoMayor}
        isPending={create.isPending}
        error={create.error instanceof Error ? create.error.message : null}
        onCancel={() => navigate(PSICOLOGIA_PATH)}
        onSubmit={async (value) => {
          await create.mutateAsync(value);
          navigate(buildPsicologiaHistoryPath(adultoId), { replace: true });
        }}
      />
    </section>
  );
}
function PsicologiaHistoryPage({ adultoId, navigate }: { adultoId: string; navigate: Navigate }) {
  const history = usePsicologiaHistoryQuery(adultoId);
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
      </section>
    );
  return (
    <section className="psicologia-stack" aria-labelledby="psicologia-title">
      <h1 className="visually-hidden" id="psicologia-title">
        Historial de sesiones de psicología
      </h1>
      <div className="psicologia-nav">
        <button className="outline-action" type="button" onClick={() => navigate(PSICOLOGIA_PATH)}>
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <span>Historial de sesiones</span>
      </div>
      <PsicologiaAdultoSummary adulto={history.data.adultoMayor} />
      <section className="psicologia-history">
        <span className="eyebrow">Sesiones registradas</span>
        {history.data.sessions.length === 0 ? (
          <p>Aún no hay sesiones registradas para esta persona.</p>
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
                  <dt>Valoración</dt>
                  <dd>{session.assessment}</dd>
                </div>
                <div>
                  <dt>Intervención</dt>
                  <dd>{session.intervention}</dd>
                </div>
                {session.agreements ? (
                  <div>
                    <dt>Acuerdos</dt>
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
