import {
  type ActividadGrupalOrganizer,
  type EmpleadoListItem,
  actividadGrupalOrganizerValues,
} from "@cuidarte/contracts";
import { ArrowLeft, Check, LockKeyhole, Search, Waypoints, X } from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { formatActividadGrupalOrganizer } from "@/features/actividades-grupales/lib/actividades-grupales-formatters";
import {
  formatEmpleadoRole,
  resolveEmpleadosApiError,
} from "@/features/empleados/lib/empleados-formatters";
import {
  useEmpleadoActividadGrupalOrganizerPermissionQuery,
  useEmpleadosQuery,
  useUpdateEmpleadoActividadGrupalOrganizerPermissionMutation,
} from "@/features/empleados/model/empleados-queries";

type AjustesActivityOrganizerPermissionsDialogProps = { onClose: () => void };
type OrganizerSelectionMap = Record<string, ActividadGrupalOrganizer[]>;
type SelectionAnimation = { organizer: ActividadGrupalOrganizer; sequence: number };

const GLOBAL_ORGANIZER_ACCESS_ROLES = new Set(["admin", "super_admin"]);
const OWN_ORGANIZER_BY_ROLE: Partial<Record<EmpleadoListItem["role"], ActividadGrupalOrganizer>> = {
  director: "director",
  enfermeria: "enfermeria",
  fisioterapeuta: "fisioterapeuta",
  medico: "medico",
  nutricionista: "nutricionista",
  psicologo: "psicologa",
  recreacionista: "recreacionista",
  trabajadora_social: "trabajadora_social",
};

export function AjustesActivityOrganizerPermissionsDialog({
  onClose,
}: AjustesActivityOrganizerPermissionsDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<string | null>(null);
  const [originalSelections, setOriginalSelections] = useState<OrganizerSelectionMap>({});
  const [draftSelections, setDraftSelections] = useState<OrganizerSelectionMap>({});
  const [selectionAnimation, setSelectionAnimation] = useState<SelectionAnimation | null>(null);
  const [showSavedState, setShowSavedState] = useState(false);
  const [closeWarningShown, setCloseWarningShown] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const peopleListRef = useRef<HTMLDivElement>(null);
  const empleadosQuery = useEmpleadosQuery({ search });
  const empleados = empleadosQuery.data?.empleados ?? [];
  const selectedEmpleado = empleados.find((item) => item.id === selectedEmpleadoId) ?? null;
  const permissionQuery = useEmpleadoActividadGrupalOrganizerPermissionQuery(
    selectedEmpleadoId ?? "",
    selectedEmpleadoId !== null,
  );
  const updateMutation = useUpdateEmpleadoActividadGrupalOrganizerPermissionMutation();

  useEffect(() => {
    if (selectedEmpleadoId !== null && empleados.some((item) => item.id === selectedEmpleadoId)) {
      return;
    }

    setSelectedEmpleadoId(empleados[0]?.id ?? null);
  }, [empleados, selectedEmpleadoId]);

  useEffect(() => {
    if (selectedEmpleadoId === null || permissionQuery.data === undefined) return;

    setOriginalSelections((current) =>
      current[selectedEmpleadoId] === undefined
        ? { ...current, [selectedEmpleadoId]: permissionQuery.data.allowedOrganizers }
        : current,
    );
    setDraftSelections((current) =>
      current[selectedEmpleadoId] === undefined
        ? { ...current, [selectedEmpleadoId]: permissionQuery.data.allowedOrganizers }
        : current,
    );
  }, [permissionQuery.data, selectedEmpleadoId]);

  const hasGlobalAccess =
    selectedEmpleado !== null && GLOBAL_ORGANIZER_ACCESS_ROLES.has(selectedEmpleado.role);
  const ownOrganizer =
    selectedEmpleado === null ? undefined : OWN_ORGANIZER_BY_ROLE[selectedEmpleado.role];
  const currentAllowedOrganizers =
    selectedEmpleadoId === null ? [] : (draftSelections[selectedEmpleadoId] ?? []);
  const selectedOrganizers = useMemo(
    () =>
      hasGlobalAccess
        ? actividadGrupalOrganizerValues
        : [
            ...new Set(
              ownOrganizer === undefined
                ? currentAllowedOrganizers
                : [ownOrganizer, ...currentAllowedOrganizers],
            ),
          ],
    [currentAllowedOrganizers, hasGlobalAccess, ownOrganizer],
  );
  const dirtyEmployeeIds = useMemo(
    () =>
      Object.keys(draftSelections).filter(
        (employeeId) =>
          !sameOrganizers(originalSelections[employeeId] ?? [], draftSelections[employeeId] ?? []),
      ),
    [draftSelections, originalSelections],
  );
  const hasChanges = dirtyEmployeeIds.length > 0;
  const orderedOrganizers = useMemo(
    () =>
      ownOrganizer === undefined
        ? actividadGrupalOrganizerValues
        : [
            ownOrganizer,
            ...actividadGrupalOrganizerValues.filter((organizer) => organizer !== ownOrganizer),
          ],
    [ownOrganizer],
  );
  const additionalSelectedCount = currentAllowedOrganizers.filter(
    (organizer) => organizer !== ownOrganizer,
  ).length;
  const allAdditionalSelected = actividadGrupalOrganizerValues.every(
    (organizer) => organizer === ownOrganizer || currentAllowedOrganizers.includes(organizer),
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    if (!showSavedState) return;

    const timeoutId = window.setTimeout(() => setShowSavedState(false), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [showSavedState]);

  function requestClose() {
    if (!hasChanges) {
      onClose();
      return;
    }

    if (!closeWarningShown) {
      setCloseWarningShown(true);
      toast.warning("Tienes cambios sin guardar. Cierra de nuevo para descartarlos.");
      return;
    }

    onClose();
  }

  function handlePeopleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    const options = Array.from(
      peopleListRef.current?.querySelectorAll<HTMLButtonElement>('button[role="option"]') ?? [],
    );
    if (options.length === 0) return;

    const currentIndex = options.findIndex((option) => option === document.activeElement);
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex =
      currentIndex < 0 ? 0 : (currentIndex + direction + options.length) % options.length;
    const nextOption = options[nextIndex];
    if (!nextOption) return;

    nextOption.focus();
    nextOption.click();
  }

  function toggleOrganizer(organizer: ActividadGrupalOrganizer) {
    if (selectedEmpleadoId === null || hasGlobalAccess || organizer === ownOrganizer) return;

    setSelectionAnimation((current) => ({
      organizer,
      sequence: (current?.sequence ?? 0) + 1,
    }));
    setDraftSelections((current) => {
      const selected = current[selectedEmpleadoId] ?? [];
      const next = selected.includes(organizer)
        ? selected.filter((item) => item !== organizer)
        : [...selected, organizer];

      return { ...current, [selectedEmpleadoId]: next };
    });
  }

  function toggleAllAdditionalOrganizers() {
    if (selectedEmpleadoId === null || hasGlobalAccess) return;

    const next = allAdditionalSelected
      ? []
      : actividadGrupalOrganizerValues.filter((organizer) => organizer !== ownOrganizer);

    setDraftSelections((current) => ({ ...current, [selectedEmpleadoId]: next }));
  }

  function discardChanges() {
    setCloseWarningShown(false);
    setDraftSelections((current) => {
      const next = { ...current };
      for (const employeeId of dirtyEmployeeIds) {
        next[employeeId] = [...(originalSelections[employeeId] ?? [])];
      }
      return next;
    });
  }

  async function saveChanges() {
    if (!hasChanges) return;

    try {
      await Promise.all(
        dirtyEmployeeIds.map((empleadoId) =>
          updateMutation.mutateAsync({
            empleadoId,
            request: { allowedOrganizers: draftSelections[empleadoId] ?? [] },
          }),
        ),
      );

      setOriginalSelections((current) => {
        const next = { ...current };
        for (const employeeId of dirtyEmployeeIds) {
          next[employeeId] = [...(draftSelections[employeeId] ?? [])];
        }
        return next;
      });
      setCloseWarningShown(false);
      setShowSavedState(true);
      toast.success("Cambios guardados.");
    } catch {
      toast.error("No fue posible guardar todos los cambios.");
    }
  }

  return (
    <div
      className="ajustes-permissions-dialog-backdrop ajustes-organizer-permissions-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) requestClose();
      }}
    >
      <section
        className="ajustes-permissions-dialog ajustes-organizer-permissions-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ajustes-organizer-permissions-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ajustes-organizer-permissions-dialog__header">
          <div>
            <span className="ajustes-organizer-permissions-dialog__badge">
              ACTIVIDADES GRUPALES
            </span>
            <h2 id="ajustes-organizer-permissions-title">Alcance de organizadores</h2>
            <p>Define para qué organizadores puede crear actividades cada persona.</p>
          </div>
          <button
            className="ajustes-permissions-dialog__close"
            type="button"
            aria-label="Cerrar"
            onClick={requestClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div
          className={`ajustes-permissions-dialog__body ajustes-organizer-permissions-dialog__body${mobileDetailOpen ? " is-mobile-detail-open" : ""}`}
        >
          <aside className="ajustes-permissions-dialog__people">
            <div className="ajustes-permissions-dialog__people-heading">
              <span>Personas</span>
              <strong>{empleados.length}</strong>
            </div>
            <label className="ajustes-permissions-dialog__search">
              <span className="visually-hidden">Buscar persona</span>
              <div>
                <Search aria-hidden="true" />
                <input
                  value={search}
                  placeholder="Buscar persona"
                  aria-label="Buscar persona"
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </label>

            {empleadosQuery.isLoading ? (
              <p className="ajustes-permissions-dialog__muted">Cargando personas...</p>
            ) : null}
            {empleadosQuery.isError ? (
              <p className="form-error" role="alert">
                {resolveEmpleadosApiError(empleadosQuery.error)}
              </p>
            ) : null}
            {!empleadosQuery.isLoading && empleados.length === 0 ? (
              <p className="ajustes-permissions-dialog__muted">No encontramos personas.</p>
            ) : null}

            <div
              ref={peopleListRef}
              className="ajustes-permissions-dialog__people-list"
              role="listbox"
              aria-label="Personas"
              onKeyDown={handlePeopleKeyDown}
            >
              {empleados.map((empleado) => (
                <PersonOption
                  key={empleado.id}
                  empleado={empleado}
                  selected={empleado.id === selectedEmpleadoId}
                  additionalCount={
                    empleado.id === selectedEmpleadoId ? additionalSelectedCount : undefined
                  }
                  isDirty={dirtyEmployeeIds.includes(empleado.id)}
                  onSelect={() => {
                    setCloseWarningShown(false);
                    setSelectedEmpleadoId(empleado.id);
                    setMobileDetailOpen(true);
                  }}
                />
              ))}
            </div>
          </aside>

          <div className="ajustes-permissions-dialog__editor ajustes-organizer-permissions-dialog__editor">
            <button
              className="ajustes-organizer-permissions-dialog__mobile-back"
              type="button"
              onClick={() => setMobileDetailOpen(false)}
            >
              <ArrowLeft aria-hidden="true" /> Personas
            </button>
            {selectedEmpleado === null ? (
              <div className="ajustes-permissions-dialog__empty">
                <Waypoints aria-hidden="true" />
                <strong>Selecciona una persona</strong>
                <p>Podrás definir el alcance de su organizador al crear actividades.</p>
              </div>
            ) : (
              <section className="ajustes-organizer-permissions-dialog__card">
                <header className="ajustes-organizer-permissions-dialog__employee-header">
                  <span
                    className="ajustes-organizer-permissions-dialog__employee-avatar"
                    aria-hidden="true"
                  >
                    <span className="ajustes-organizer-permissions-dialog__avatar-text">
                      {getInitials(selectedEmpleado.fullName)}
                    </span>
                  </span>
                  <div>
                    <strong>{formatPersonName(selectedEmpleado.fullName)}</strong>
                    <span>
                      {formatEmpleadoRole(selectedEmpleado.role)} · {selectedEmpleado.email}
                    </span>
                  </div>
                </header>

                {permissionQuery.isLoading ? (
                  <p className="ajustes-permissions-dialog__muted" aria-busy="true">
                    Cargando alcance...
                  </p>
                ) : null}
                {permissionQuery.isError ? (
                  <p className="form-error" role="alert">
                    {resolveEmpleadosApiError(permissionQuery.error)}
                  </p>
                ) : null}

                {permissionQuery.data !== undefined ? (
                  <div className="ajustes-organizer-permissions-dialog__selection">
                    <div className="ajustes-organizer-permissions-dialog__selection-header">
                      <strong>
                        Organizadores permitidos <span>· {selectedOrganizers.length} de 8</span>
                      </strong>
                      <button
                        type="button"
                        disabled={hasGlobalAccess || updateMutation.isPending}
                        onClick={toggleAllAdditionalOrganizers}
                      >
                        {allAdditionalSelected ? "Quitar adicionales" : "Seleccionar todos"}
                      </button>
                    </div>
                    <div className="ajustes-organizer-permissions-dialog__organizer-list">
                      {orderedOrganizers.map((organizer) => (
                        <OrganizerPermissionOption
                          key={`${organizer}-${selectionAnimation?.organizer === organizer ? selectionAnimation.sequence : 0}`}
                          organizer={organizer}
                          isOwnOrganizer={organizer === ownOrganizer}
                          selected={selectedOrganizers.includes(organizer)}
                          isAnimating={selectionAnimation?.organizer === organizer}
                          disabled={
                            hasGlobalAccess ||
                            organizer === ownOrganizer ||
                            updateMutation.isPending
                          }
                          onToggle={() => toggleOrganizer(organizer)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            )}
          </div>
        </div>

        <footer className="ajustes-organizer-permissions-dialog__footer">
          <span className={hasChanges ? "is-dirty" : showSavedState ? "is-saved" : ""}>
            {hasChanges
              ? `Cambios sin guardar · ${dirtyEmployeeIds.length} persona${dirtyEmployeeIds.length === 1 ? "" : "s"}`
              : showSavedState
                ? "Cambios guardados"
                : ""}
          </span>
          <div>
            {hasChanges ? (
              <button type="button" disabled={updateMutation.isPending} onClick={discardChanges}>
                Descartar
              </button>
            ) : null}
            <button
              className="is-primary"
              type="button"
              disabled={!hasChanges || updateMutation.isPending}
              onClick={() => void saveChanges()}
            >
              {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function OrganizerPermissionOption({
  organizer,
  isOwnOrganizer,
  selected,
  isAnimating,
  disabled,
  onToggle,
}: {
  organizer: ActividadGrupalOrganizer;
  isOwnOrganizer: boolean;
  selected: boolean;
  isAnimating: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className={[
        "ajustes-organizer-permissions-dialog__organizer",
        selected ? "is-selected" : "",
        isAnimating ? "is-just-changed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={onToggle}
    >
      <span className="ajustes-organizer-permissions-dialog__organizer-check" aria-hidden="true">
        {selected ? <Check /> : null}
      </span>
      <span className="ajustes-organizer-permissions-dialog__organizer-copy">
        <strong>{formatActividadGrupalOrganizer(organizer)}</strong>
        {isOwnOrganizer ? (
          <small>
            <LockKeyhole aria-hidden="true" /> Propio
          </small>
        ) : null}
      </span>
    </button>
  );
}

function PersonOption({
  empleado,
  selected,
  additionalCount,
  isDirty,
  onSelect,
}: {
  empleado: EmpleadoListItem;
  selected: boolean;
  additionalCount: number | undefined;
  isDirty: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={
        selected
          ? "ajustes-permissions-dialog__person is-selected"
          : "ajustes-permissions-dialog__person"
      }
      type="button"
      role="option"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
    >
      <span className="ajustes-permissions-dialog__avatar" aria-hidden="true">
        <span className="ajustes-organizer-permissions-dialog__avatar-text">
          {getInitials(empleado.fullName)}
        </span>
      </span>
      <span>
        <strong>{formatPersonName(empleado.fullName)}</strong>
        <small>{formatEmpleadoRole(empleado.role)}</small>
      </span>
      {additionalCount !== undefined && additionalCount > 0 ? (
        <span className="ajustes-organizer-permissions-dialog__person-count">
          +{additionalCount}
        </span>
      ) : null}
      {isDirty ? (
        <span
          className="ajustes-organizer-permissions-dialog__person-dirty-dot"
          aria-label="Cambios sin guardar"
        />
      ) : null}
    </button>
  );
}

function sameOrganizers(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "??";
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();

  return ((parts[0]?.[0] ?? "?") + (parts.at(-1)?.[0] ?? "?")).toUpperCase();
}

function formatPersonName(fullName: string): string {
  const trimmedName = fullName.trim();
  if (!/[A-ZÁÉÍÓÚÜÑ]/.test(trimmedName) || trimmedName !== trimmedName.toUpperCase()) {
    return fullName;
  }

  return trimmedName
    .toLocaleLowerCase("es-CO")
    .split(/(\s+)/)
    .map((part) => {
      if (/\s+/.test(part)) return part;
      if (["de", "del", "la", "y"].includes(part)) return part;
      return part.charAt(0).toLocaleUpperCase("es-CO") + part.slice(1);
    })
    .join("");
}
