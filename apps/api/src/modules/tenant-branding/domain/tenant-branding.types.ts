export type BufferedTenantLogoUpload = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

export type ProcessedTenantLogo = {
  buffer: Buffer;
  mimeType: "image/png";
  sizeBytes: number;
  checksum: string;
  width: number;
  height: number;
};

export type TenantLogoVersionRecord = {
  id: string;
  tenantId: string;
  originalName: string;
  mimeType: "image/png";
  sizeBytes: number;
  checksum: string;
  relativePath: string;
  uploadedByUserId: string;
  createdAt: Date;
};

export type CreateAndActivateTenantLogoCommand = {
  tenantId: string;
  originalName: string;
  mimeType: "image/png";
  sizeBytes: number;
  checksum: string;
  relativePath: string;
  actorUserId: string;
};

export type RemoveActiveTenantLogoCommand = {
  tenantId: string;
  actorUserId: string;
};
