import { userPermissionCatalog } from "@cuidarte/contracts";
import { describe, expect, it } from "vitest";

import { PERMISSION_COLUMNS } from "./ajustes-permissions-dialog";

describe("matriz de permisos por persona", () => {
  it("ubica cada permiso del catálogo en una sola columna", () => {
    const unplaced = userPermissionCatalog
      // Report charts are granted from their own dialog, not from this matrix.
      .filter((permission) => !permission.key.startsWith("reportes.chart."))
      .filter(
        (permission) =>
          PERMISSION_COLUMNS.filter((column) => permission.key.endsWith(`.${column.key}`))
            .length !== 1,
      )
      .map((permission) => permission.key);

    expect(unplaced).toEqual([]);
  });
});
