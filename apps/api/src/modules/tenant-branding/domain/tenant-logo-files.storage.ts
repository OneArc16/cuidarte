export const TENANT_LOGO_FILES_STORAGE = Symbol("TENANT_LOGO_FILES_STORAGE");

export type StoredTenantLogoFile = {
  relativePath: string;
};

export type ReadTenantLogoFile = {
  buffer: Buffer;
  contentType: "image/png";
};

export type TenantLogoFilesStorage = {
  saveFile(scope: { tenantId: string }, file: { buffer: Buffer }): Promise<StoredTenantLogoFile>;
  readFile(relativePath: string): Promise<ReadTenantLogoFile>;
  deleteFile(relativePath: string): Promise<void>;
};
