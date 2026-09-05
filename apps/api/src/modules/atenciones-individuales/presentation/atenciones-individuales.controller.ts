import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  atencionIndividualDetailSchema,
  atencionIndividualHistoryResponseSchema,
  atencionIndividualLookupResponseSchema,
  medicalAttentionHistoryResponseSchema,
  createAtencionIndividualRequestSchema,
  updateAtencionIndividualRequestSchema,
  updateAtencionIndividualMultipartPayloadSchema,
} from "@cuidarte/contracts";
import { type FastifyReply } from "fastify";
import { type Multipart, type MultipartFile } from "@fastify/multipart";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { AtencionesIndividualesService } from "../application/atenciones-individuales.service";
import { type BufferedAtencionIndividualUpload } from "../domain/atencion-individual.types";

const idParamSchema = z.uuid();

type MultipartAuthenticatedRequest = AuthenticatedRequest & {
  isMultipart: () => boolean;
  parts: () => AsyncIterableIterator<Multipart>;
};

@ApiTags("atenciones-individuales")
@Controller("atenciones-individuales")
@UseGuards(SessionGuard)
export class AtencionesIndividualesController {
  constructor(private readonly atencionesService: AtencionesIndividualesService) {}

  @Get("adultos-mayores/:adultoMayorId/lookup")
  @ApiOkResponse({ description: "Informacion basica y consecutivo sugerido." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no puede consultar este adulto mayor." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async lookupAdultoMayor(
    @Param("adultoMayorId") adultoMayorIdParam: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const adultoMayorId = parseZodSchema(idParamSchema, adultoMayorIdParam);
    const result = await this.atencionesService.lookupAdultoMayor(
      adultoMayorId,
      request.currentUser,
    );

    return atencionIndividualLookupResponseSchema.parse(result);
  }

  @Get("adultos-mayores/:adultoMayorId/history")
  @ApiOkResponse({ description: "Historia clinica del adulto mayor segun permisos del usuario." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no puede consultar esta historia clinica." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async getHistoriaClinica(
    @Param("adultoMayorId") adultoMayorIdParam: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const adultoMayorId = parseZodSchema(idParamSchema, adultoMayorIdParam);
    const result = await this.atencionesService.getHistoriaClinica(
      adultoMayorId,
      request.currentUser,
    );

    return atencionIndividualHistoryResponseSchema.parse(result);
  }

  @Get("adultos-mayores/:adultoMayorId/medical-history")
  @ApiOkResponse({
    description: "Proyeccion de atenciones medicas del adulto mayor segun permisos del usuario.",
  })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no puede consultar esta historia clinica." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async getMedicalHistoriaClinica(
    @Param("adultoMayorId") adultoMayorIdParam: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const adultoMayorId = parseZodSchema(idParamSchema, adultoMayorIdParam);
    const result = await this.atencionesService.getMedicalHistoriaClinica(
      adultoMayorId,
      request.currentUser,
    );

    return medicalAttentionHistoryResponseSchema.parse(result);
  }

  @Post()
  @ApiOkResponse({ description: "Atencion individual creada." })
  @ApiBadRequestResponse({ description: "Solicitud invalida o soportes no permitidos." })
  @ApiConflictResponse({ description: "Consecutivo duplicado." })
  @ApiForbiddenResponse({ description: "El usuario no puede crear atenciones." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async createAtencion(@Body() body: unknown, @Req() request: MultipartAuthenticatedRequest) {
    if (request.isMultipart()) {
      const multipartPayload = await parseAtencionMultipartRequest(request);
      const command = parseZodSchema(createAtencionIndividualRequestSchema, multipartPayload.body);
      const record = await this.atencionesService.createAtencion(
        command,
        request.currentUser,
        multipartPayload.supports,
      );

      return atencionIndividualDetailSchema.parse(record);
    }

    const command = parseZodSchema(createAtencionIndividualRequestSchema, body);
    const record = await this.atencionesService.createAtencion(command, request.currentUser);

    return atencionIndividualDetailSchema.parse(record);
  }

  @Get(":id")
  @ApiOkResponse({ description: "Detalle editable de atencion individual." })
  @ApiNotFoundResponse({ description: "Atencion no encontrada." })
  @ApiForbiddenResponse({ description: "El usuario no puede consultar esta atencion." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async getAtencion(@Param("id") idParam: string, @Req() request: AuthenticatedRequest) {
    const id = parseZodSchema(idParamSchema, idParam);
    const record = await this.atencionesService.getAtencion(id, request.currentUser);

    return atencionIndividualDetailSchema.parse(record);
  }

  @Patch(":id")
  @ApiOkResponse({ description: "Atencion individual actualizada." })
  @ApiBadRequestResponse({ description: "Solicitud invalida o soportes no permitidos." })
  @ApiConflictResponse({ description: "Consecutivo duplicado." })
  @ApiNotFoundResponse({ description: "Atencion no encontrada." })
  @ApiForbiddenResponse({ description: "El usuario no puede actualizar esta atencion." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async updateAtencion(
    @Param("id") idParam: string,
    @Body() body: unknown,
    @Req() request: MultipartAuthenticatedRequest,
  ) {
    const id = parseZodSchema(idParamSchema, idParam);

    if (request.isMultipart()) {
      const multipartPayload = await parseAtencionMultipartRequest(request);
      const parsedPayload = parseZodSchema(
        updateAtencionIndividualMultipartPayloadSchema,
        multipartPayload.body,
      );
      const record = await this.atencionesService.updateAtencion(
        id,
        parsedPayload.payload,
        request.currentUser,
        {
          supportUploads: multipartPayload.supports,
          removedSupportFileIds: parsedPayload.removedSupportFileIds,
        },
      );

      return atencionIndividualDetailSchema.parse(record);
    }

    const command = parseZodSchema(updateAtencionIndividualRequestSchema, body);
    const record = await this.atencionesService.updateAtencion(id, command, request.currentUser);

    return atencionIndividualDetailSchema.parse(record);
  }

  @Get(":id/support-files/:fileId")
  @ApiOkResponse({ description: "Descarga de soportes de la atencion individual." })
  @ApiNotFoundResponse({ description: "Atencion o soporte no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no puede acceder al soporte." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async downloadSupportFile(
    @Param("id") idParam: string,
    @Param("fileId") fileIdParam: string,
    @Req() request: AuthenticatedRequest,
    @Res() reply: FastifyReply,
  ) {
    const id = parseZodSchema(idParamSchema, idParam);
    const fileId = parseZodSchema(idParamSchema, fileIdParam);
    const file = await this.atencionesService.downloadSupportFile(id, fileId, request.currentUser);

    return sendFile(reply, file, file.disposition);
  }
}

function sendFile(
  reply: FastifyReply,
  file: { buffer: Buffer; contentType: string; filename: string },
  disposition: "attachment",
) {
  reply.header("Content-Type", file.contentType);
  reply.header(
    "Content-Disposition",
    `${disposition}; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
  );

  return reply.send(file.buffer);
}

async function parseAtencionMultipartRequest(request: MultipartAuthenticatedRequest) {
  if (!request.isMultipart()) {
    throw new BadRequestException("La solicitud debe enviarse como multipart/form-data.");
  }

  let body: unknown = null;
  const supports: BufferedAtencionIndividualUpload[] = [];

  for await (const part of request.parts()) {
    if (part.type === "field") {
      if (part.fieldname !== "payload") {
        throw new BadRequestException("El formulario contiene un campo no soportado.");
      }

      if (body !== null) {
        throw new BadRequestException("El payload del formulario no puede repetirse.");
      }

      body = parseMultipartPayloadValue(part.value);
      continue;
    }

    if (part.fieldname === "supports") {
      supports.push(await toBufferedUpload(part));
      continue;
    }

    throw new BadRequestException("El formulario contiene un archivo no soportado.");
  }

  if (body === null) {
    throw new BadRequestException("No se recibio el payload de la atencion.");
  }

  return { body, supports };
}

function parseMultipartPayloadValue(value: unknown): unknown {
  if (typeof value !== "string") {
    throw new BadRequestException("El payload de la atencion es invalido.");
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new BadRequestException("El payload de la atencion no tiene un JSON valido.");
  }
}

async function toBufferedUpload(part: MultipartFile): Promise<BufferedAtencionIndividualUpload> {
  const buffer = await part.toBuffer();

  return {
    originalName: part.filename.trim() === "" ? "archivo" : part.filename,
    mimeType: part.mimetype === "" ? "application/octet-stream" : part.mimetype,
    sizeBytes: buffer.byteLength,
    buffer,
  };
}
