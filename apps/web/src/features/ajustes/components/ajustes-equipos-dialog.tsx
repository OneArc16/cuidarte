import { Check, Eye, EyeOff, Pencil, Plus, UsersRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  useCreateEquipoMutation,
  useEquiposQuery,
  useUpdateEquipoMutation,
} from "@/features/equipos/model/equipos-queries";
import { resolveEmpleadosApiError } from "@/features/empleados/lib/empleados-formatters";

type AjustesEquiposDialogProps = { onClose: () => void };

export function AjustesEquiposDialog({ onClose }: AjustesEquiposDialogProps) {
  const equiposQuery = useEquiposQuery();
  const createMutation = useCreateEquipoMutation();
  const updateMutation = useUpdateEquipoMutation();
  const [newTeamName, setNewTeamName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const equipos = equiposQuery.data?.equipos ?? [];
  const error =
    resolveEmpleadosApiError(equiposQuery.error) ??
    resolveEmpleadosApiError(createMutation.error) ??
    resolveEmpleadosApiError(updateMutation.error);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function createTeam() {
    const name = newTeamName.trim();
    if (name === "") return;

    createMutation.mutate(
      { name },
      {
        onSuccess: () => {
          setNewTeamName("");
          toast.success("Equipo creado.");
        },
      },
    );
  }

  function saveTeam(id: string) {
    const name = editingName.trim();
    if (name === "") return;

    updateMutation.mutate(
      { id, request: { name } },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditingName("");
          toast.success("Equipo actualizado.");
        },
      },
    );
  }

  function setTeamVisibility(id: string, isVisible: boolean) {
    updateMutation.mutate(
      { id, request: { isVisible } },
      { onSuccess: () => toast.success(isVisible ? "Equipo visible." : "Equipo oculto.") },
    );
  }

  return (
    <div className="ajustes-equipos-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="ajustes-equipos-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ajustes-equipos-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ajustes-equipos-dialog__header">
          <div>
            <span className="ajustes-equipos-dialog__eyebrow">
              <UsersRound aria-hidden="true" /> Organización
            </span>
            <h2 id="ajustes-equipos-title">Equipos de trabajo</h2>
            <p>Organiza las especialidades que comparten actividades y consecutivos.</p>
          </div>
          <button type="button" className="ajustes-equipos-dialog__close" aria-label="Cerrar" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="ajustes-equipos-dialog__body">
          <form
            className="ajustes-equipos-dialog__create"
            onSubmit={(event) => {
              event.preventDefault();
              createTeam();
            }}
          >
            <label>
              <span>Nuevo equipo</span>
              <input
                value={newTeamName}
                maxLength={120}
                placeholder="Ej. Terapia ocupacional"
                onChange={(event) => setNewTeamName(event.target.value)}
              />
            </label>
            <button
              className="ajustes-equipos-dialog__create-button"
              type="submit"
              aria-label="Crear equipo"
              title="Crear equipo"
              disabled={newTeamName.trim() === "" || createMutation.isPending}
            >
              <Plus aria-hidden="true" />
            </button>
          </form>

          {error !== null ? <p className="form-error" role="alert">{error}</p> : null}
          {equiposQuery.isLoading ? <p className="ajustes-equipos-dialog__muted">Cargando equipos...</p> : null}
          {!equiposQuery.isLoading && equipos.length === 0 ? (
            <p className="ajustes-equipos-dialog__muted">Aún no hay equipos creados.</p>
          ) : null}

          <ul className="ajustes-equipos-dialog__list">
            {equipos.map((team) => {
              const isEditing = editingId === team.id;

              return (
                <li key={team.id}>
                  {isEditing ? (
                    <form
                      className="ajustes-equipos-dialog__edit-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        saveTeam(team.id);
                      }}
                    >
                      <input
                        aria-label={`Nombre de ${team.name}`}
                        value={editingName}
                        maxLength={120}
                        autoFocus
                        onChange={(event) => setEditingName(event.target.value)}
                      />
                      <button type="submit" aria-label={`Guardar ${team.name}`} disabled={updateMutation.isPending}>
                        <Check aria-hidden="true" />
                      </button>
                      <button type="button" aria-label={`Cancelar edición de ${team.name}`} onClick={() => setEditingId(null)}>
                        <X aria-hidden="true" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="ajustes-equipos-dialog__team-name">
                        <strong>{team.name}</strong>
                        {!team.isVisible ? <span>Oculto</span> : null}
                      </div>
                      <div className="ajustes-equipos-dialog__actions">
                        <button
                          type="button"
                          aria-label={`${team.isVisible ? "Ocultar" : "Mostrar"} ${team.name}`}
                          title={team.isVisible ? "Ocultar equipo" : "Mostrar equipo"}
                          disabled={updateMutation.isPending}
                          onClick={() => setTeamVisibility(team.id, !team.isVisible)}
                        >
                          {team.isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                          {team.isVisible ? "Ocultar" : "Mostrar"}
                        </button>
                        <button
                          type="button"
                          aria-label={`Editar ${team.name}`}
                          onClick={() => {
                            setEditingId(team.id);
                            setEditingName(team.name);
                          }}
                        >
                          <Pencil aria-hidden="true" /> Editar
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
