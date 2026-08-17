export class AdultoMayorImportConcurrencyError extends Error {
  constructor() {
    super("Los datos cambiaron despues de validar el archivo.");
    this.name = "AdultoMayorImportConcurrencyError";
  }
}
