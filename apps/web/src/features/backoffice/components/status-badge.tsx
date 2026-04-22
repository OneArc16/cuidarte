export function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={isActive ? "status-badge status-badge--active" : "status-badge"}>
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}
