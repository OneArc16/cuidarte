type ActividadesGrupalesCountProps = {
  count: number;
  isLoading: boolean;
};

/** Number of activities matching the current filters (the API applies every filter). */
export function ActividadesGrupalesCount({ count, isLoading }: ActividadesGrupalesCountProps) {
  if (isLoading) {
    return null;
  }

  return (
    <span className="actividades-count" role="status">
      <strong>{count}</strong> {count === 1 ? "actividad" : "actividades"}
    </span>
  );
}
