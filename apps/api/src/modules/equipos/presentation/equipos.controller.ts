import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import {
  createEquipoRequestSchema,
  equipoOptionSchema,
  equiposListResponseSchema,
  updateEquipoRequestSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { EquiposService } from "../application/equipos.service";

const idParamSchema = z.uuid();

@Controller("equipos")
@UseGuards(SessionGuard)
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest) {
    return equiposListResponseSchema.parse({ equipos: await this.equiposService.list(request.currentUser) });
  }

  @Post()
  async create(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return equipoOptionSchema.parse(
      await this.equiposService.create(parseZodSchema(createEquipoRequestSchema, body), request.currentUser),
    );
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return equipoOptionSchema.parse(
      await this.equiposService.update(
        parseZodSchema(idParamSchema, id),
        parseZodSchema(updateEquipoRequestSchema, body),
        request.currentUser,
      ),
    );
  }
}
