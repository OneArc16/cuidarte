import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  cie10OptionsResponseSchema,
  cie10SearchQuerySchema,
} from "@cuidarte/contracts";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { Cie10Service } from "../application/cie10.service";

@ApiTags("cie10")
@Controller("cie10")
@UseGuards(SessionGuard)
export class Cie10Controller {
  constructor(private readonly cie10Service: Cie10Service) {}

  @Get("options")
  @ApiOkResponse({ description: "Opciones de diagnosticos CIE-10." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async searchOptions(@Query() query: unknown, @Req() _request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(cie10SearchQuerySchema, query);
    const options = await this.cie10Service.searchOptions(parsedQuery);

    return cie10OptionsResponseSchema.parse({ options });
  }
}
