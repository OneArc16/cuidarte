import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  createEmpleadoRequestSchema,
  empleadoDetailResponseSchema,
  empleadoListQuerySchema,
  empleadoListResponseSchema,
  empleadoTenantOptionsResponseSchema,
  updateEmpleadoRequestSchema,
} from "@cuidarte/contracts";
import { type FastifyReply } from "fastify";
import { type Multipart, type MultipartFile } from "@fastify/multipart";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { EmpleadosSignatureService } from "../application/empleados-signature.service";
import { EmpleadosService } from "../application/empleados.service";
import { type BufferedEmpleadoSignatureUpload } from "../domain/empleado.types";

const empleadoIdParamSchema = z.uuid();

type MultipartAuthenticatedRequest = AuthenticatedRequest & {
  isMultipart: () => boolean;
  parts: () => AsyncIterableIterator<Multipart>;
};

@ApiTags("empleados")
@Controller("empleados")
@UseGuards(SessionGuard)
export class EmpleadosController {
  constructor(
    private readonly empleadosService: EmpleadosService,
    private readonly empleadosSignatureService: EmpleadosSignatureService,
  ) {}

  @Get()
  @ApiOkResponse({ description: "Listado de empleados." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos de empleados." })
  async listEmpleados(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(empleadoListQuerySchema, query);
    const empleados = await this.empleadosService.listEmpleados(
      parsedQuery,
      request.currentUser,
    );

    return empleadoListResponseSchema.parse({ empleados });
  }

  @Get("tenant-options")
  @ApiOkResponse({ description: "Centros activos disponibles para crear usuarios." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async listTenantOptions(@Req() request: AuthenticatedRequest) {
    const tenants = await this.empleadosService.listTenantOptions(request.currentUser);

    return empleadoTenantOptionsResponseSchema.parse({ tenants });
  }

  @Post()
  @ApiOkResponse({ description: "Usuario creado." })
  @ApiBadRequestResponse({ description: "Solicitud invalida." })
  @ApiConflictResponse({ description: "Correo o documento duplicado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos de empleados." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async createEmpleado(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const command = parseZodSchema(createEmpleadoRequestSchema, body);
    const detail = await this.empleadosService.createEmpleado(command, request.currentUser);

    return empleadoDetailResponseSchema.parse(detail);
  }

  @Patch(":id")
  @ApiOkResponse({ description: "Usuario actualizado." })
  @ApiBadRequestResponse({ description: "Solicitud invalida." })
  @ApiConflictResponse({ description: "Correo o documento duplicado." })
  @ApiNotFoundResponse({ description: "Usuario no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos de empleados." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async updateEmpleado(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const empleadoId = parseZodSchema(empleadoIdParamSchema, id);
    const command = parseZodSchema(updateEmpleadoRequestSchema, body);
    const detail = await this.empleadosService.updateEmpleado(
      empleadoId,
      command,
      request.currentUser,
    );

    return empleadoDetailResponseSchema.parse(detail);
  }

  @Post(":id/signature")
  @ApiOkResponse({ description: "Firma del usuario cargada." })
  @ApiConsumes("multipart/form-data")
  @ApiBadRequestResponse({ description: "Archivo de firma invalido." })
  @ApiNotFoundResponse({ description: "Usuario no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos de empleados." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async uploadSignature(
    @Param("id") id: string,
    @Req() request: MultipartAuthenticatedRequest,
  ) {
    const empleadoId = parseZodSchema(empleadoIdParamSchema, id);
    const signature = await parseEmpleadoSignatureMultipartRequest(request);

    await this.empleadosSignatureService.uploadSignature(
      empleadoId,
      signature,
      request.currentUser,
    );

    const detail = await this.empleadosService.getEmpleado(empleadoId, request.currentUser);

    return empleadoDetailResponseSchema.parse(detail);
  }

  @Get(":id/signature/file")
  @ApiOkResponse({ description: "Archivo de firma del usuario." })
  @ApiProduces("image/png", "image/jpeg", "image/webp")
  @ApiNotFoundResponse({ description: "Usuario o firma no encontrados." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos sobre esta firma." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async downloadSignatureFile(
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
    @Res() reply: FastifyReply,
  ) {
    const empleadoId = parseZodSchema(empleadoIdParamSchema, id);
    const file = await this.empleadosSignatureService.downloadLatestSignatureFile(
      empleadoId,
      request.currentUser,
    );

    reply.header("Content-Type", file.contentType);
    reply.header("Content-Disposition", `inline; filename="${file.originalName}"`);

    return reply.send(file.buffer);
  }

  @Get(":id")
  @ApiOkResponse({ description: "Detalle de empleado." })
  @ApiNotFoundResponse({ description: "Usuario no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos de empleados." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async getEmpleado(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    const empleadoId = parseZodSchema(empleadoIdParamSchema, id);
    const detail = await this.empleadosService.getEmpleado(empleadoId, request.currentUser);

    return empleadoDetailResponseSchema.parse(detail);
  }
}

async function parseEmpleadoSignatureMultipartRequest(request: MultipartAuthenticatedRequest) {
  if (!request.isMultipart()) {
    throw new BadRequestException("La solicitud debe enviarse como multipart/form-data.");
  }

  let signature: BufferedEmpleadoSignatureUpload | null = null;

  for await (const part of request.parts()) {
    if (part.type === "field") {
      throw new BadRequestException("El formulario de firma no admite campos adicionales.");
    }

    if (part.fieldname !== "signature") {
      throw new BadRequestException("El formulario contiene un archivo no soportado.");
    }

    if (signature !== null) {
      throw new BadRequestException("Solo puedes adjuntar un archivo de firma por solicitud.");
    }

    signature = await toBufferedUpload(part);
  }

  if (signature === null) {
    throw new BadRequestException("Debes adjuntar la imagen de la firma.");
  }

  return signature;
}

async function toBufferedUpload(part: MultipartFile): Promise<BufferedEmpleadoSignatureUpload> {
  const buffer = await part.toBuffer();

  return {
    originalName: part.filename.trim() === "" ? "firma" : part.filename,
    mimeType: part.mimetype === "" ? "application/octet-stream" : part.mimetype,
    sizeBytes: buffer.byteLength,
    buffer,
  };
}
