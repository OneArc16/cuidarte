import {
  removeTenantLogoResponseSchema,
  uploadTenantLogoResponseSchema,
} from "@cuidarte/contracts";
import { type Multipart, type MultipartFile } from "@fastify/multipart";
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  PayloadTooLargeException,
  Put,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { type FastifyReply } from "fastify";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { RequireRoles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { SessionGuard } from "../../auth/session.guard";
import { TenantBrandingService } from "../application/tenant-branding.service";
import { MAX_TENANT_LOGO_FILE_SIZE_BYTES } from "../application/tenant-logo-image-processor";
import { type BufferedTenantLogoUpload } from "../domain/tenant-branding.types";

const tenantIdParamSchema = z.uuid();

type MultipartAuthenticatedRequest = AuthenticatedRequest & {
  isMultipart: () => boolean;
  parts: () => AsyncIterableIterator<Multipart>;
};

@ApiTags("tenant-branding")
@Controller("backoffice/tenants")
@UseGuards(SessionGuard, RolesGuard)
@RequireRoles("super_admin")
export class TenantBrandingController {
  constructor(private readonly tenantBrandingService: TenantBrandingService) {}

  @Put(":tenantId/logo")
  @ApiConsumes("multipart/form-data")
  @ApiOkResponse({ description: "Logo activo del centro actualizado." })
  @ApiBadRequestResponse({ description: "Imagen o formulario multipart invalido." })
  @ApiNotFoundResponse({ description: "Tenant no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene rol SuperAdmin." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async uploadLogo(
    @Param("tenantId") tenantIdValue: string,
    @Req() request: MultipartAuthenticatedRequest,
  ) {
    const tenantId = parseZodSchema(tenantIdParamSchema, tenantIdValue);
    const upload = await parseTenantLogoMultipartRequest(request);
    const metadata = await this.tenantBrandingService.uploadLogo(
      tenantId,
      upload,
      request.currentUser,
    );

    return uploadTenantLogoResponseSchema.parse(metadata);
  }

  @Get(":tenantId/logo/file")
  @ApiProduces("image/png")
  @ApiOkResponse({ description: "Archivo del logo activo del centro." })
  @ApiNotFoundResponse({ description: "Tenant o logo activo no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene rol SuperAdmin." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async getLogoFile(
    @Param("tenantId") tenantIdValue: string,
    @Req() request: AuthenticatedRequest,
    @Res() reply: FastifyReply,
  ) {
    const tenantId = parseZodSchema(tenantIdParamSchema, tenantIdValue);
    const { file, version } = await this.tenantBrandingService.getAdministrativeLogoFile(
      tenantId,
      request.currentUser,
    );

    reply.header("Content-Type", file.contentType);
    reply.header(
      "Content-Disposition",
      `inline; filename="${toDownloadFilename(version.originalName)}"`,
    );
    reply.header("Cache-Control", "private, no-store");

    return reply.send(file.buffer);
  }

  @Delete(":tenantId/logo")
  @ApiOkResponse({ description: "Asignacion del logo activo retirada." })
  @ApiNotFoundResponse({ description: "Tenant no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene rol SuperAdmin." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async removeLogo(@Param("tenantId") tenantIdValue: string, @Req() request: AuthenticatedRequest) {
    const tenantId = parseZodSchema(tenantIdParamSchema, tenantIdValue);
    await this.tenantBrandingService.removeActiveLogo(tenantId, request.currentUser);

    return removeTenantLogoResponseSchema.parse({ success: true });
  }
}

export async function parseTenantLogoMultipartRequest(
  request: MultipartAuthenticatedRequest,
): Promise<BufferedTenantLogoUpload> {
  if (!request.isMultipart()) {
    throw new BadRequestException("La solicitud debe enviarse como multipart/form-data.");
  }

  let logo: BufferedTenantLogoUpload | null = null;

  for await (const part of request.parts()) {
    if (part.type === "field") {
      throw new BadRequestException("El formulario del logo no admite campos adicionales.");
    }

    if (part.fieldname !== "logo") {
      throw new BadRequestException("El formulario contiene un archivo no soportado.");
    }

    if (logo !== null) {
      throw new BadRequestException("Solo puedes adjuntar un archivo de logo por solicitud.");
    }

    logo = await toBufferedUpload(part);
  }

  if (logo === null) {
    throw new BadRequestException("Debes adjuntar la imagen del logo.");
  }

  return logo;
}

async function toBufferedUpload(part: MultipartFile): Promise<BufferedTenantLogoUpload> {
  const chunks: Buffer[] = [];
  let sizeBytes = 0;

  for await (const chunk of part.file) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    sizeBytes += bufferChunk.byteLength;

    if (sizeBytes > MAX_TENANT_LOGO_FILE_SIZE_BYTES) {
      throw new PayloadTooLargeException("El logo no puede superar 2 MB.");
    }

    chunks.push(bufferChunk);
  }

  if (part.file.truncated) {
    throw new PayloadTooLargeException("El logo no puede superar 2 MB.");
  }

  const buffer = Buffer.concat(chunks, sizeBytes);

  return {
    originalName: part.filename.trim() === "" ? "logo" : part.filename,
    mimeType: part.mimetype === "" ? "application/octet-stream" : part.mimetype,
    sizeBytes,
    buffer,
  };
}

function toDownloadFilename(originalName: string): string {
  const baseName = originalName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0000-\u001f\u007f"\\/]/g, "-")
    .replace(/[^\x20-\x7e]/g, "-")
    .replace(/\.[^.]+$/, "")
    .trim()
    .slice(0, 200);

  return `${baseName === "" ? "logo" : baseName}.png`;
}
