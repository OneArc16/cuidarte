import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { type HealthResponse, healthResponseSchema } from "@cuidarte/contracts";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOkResponse({
    description: "API health check.",
    schema: {
      example: {
        service: "cuidarte-api",
        status: "ok",
        timestamp: "2026-04-21T12:00:00.000Z",
      },
    },
  })
  getHealth(): HealthResponse {
    return healthResponseSchema.parse({
      service: "cuidarte-api",
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }
}
