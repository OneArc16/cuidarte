import {
  actividadGrupalGlobalSeriesSchema,
  type ActividadGrupalGlobalSeries,
  type AuthUser,
  type UpdateActividadGrupalGlobalSeriesRequest,
} from "@cuidarte/contracts";
import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";

import {
  ACTIVIDAD_GRUPAL_GLOBAL_SERIES_REPOSITORY,
  type ActividadGrupalGlobalSeriesRepository,
} from "../domain/actividad-grupal-global-series.repository";
import { type ActividadGrupalGlobalSeriesRecord } from "../domain/actividad-grupal-global-series.types";

@Injectable()
export class ActividadGrupalGlobalSeriesService {
  constructor(
    @Inject(ACTIVIDAD_GRUPAL_GLOBAL_SERIES_REPOSITORY)
    private readonly repository: ActividadGrupalGlobalSeriesRepository,
  ) {}

  async get(actor: AuthUser): Promise<ActividadGrupalGlobalSeries> {
    this.ensureCanManageGlobalSeries(actor);

    return this.toResponse(await this.repository.findGlobalSeries());
  }

  async resolveForCreate(): Promise<ActividadGrupalGlobalSeriesRecord> {
    return await this.repository.findGlobalSeries();
  }

  async update(
    command: UpdateActividadGrupalGlobalSeriesRequest,
    actor: AuthUser,
  ): Promise<ActividadGrupalGlobalSeries> {
    this.ensureCanManageGlobalSeries(actor);

    const prefix = command.enabled ? (command.prefix?.trim().toUpperCase() ?? "") : null;

    if (command.enabled && !/^[A-Z0-9]{2,24}$/.test(prefix ?? "")) {
      throw new BadRequestException("El prefijo global solo puede incluir letras y números.");
    }

    return this.toResponse(
      await this.repository.updateGlobalSeries({
        enabled: command.enabled,
        prefix,
        actorUserId: actor.id,
      }),
    );
  }

  private ensureCanManageGlobalSeries(actor: AuthUser): void {
    if (actor.role !== "super_admin") {
      throw new ForbiddenException("Solo un super administrador puede cambiar la serie global.");
    }
  }

  private toResponse(record: ActividadGrupalGlobalSeriesRecord): ActividadGrupalGlobalSeries {
    return actividadGrupalGlobalSeriesSchema.parse({
      enabled: record.enabled,
      prefix: record.prefix,
      tenantCount: record.tenantCount,
      updatedAt: record.updatedAt?.toISOString() ?? null,
    });
  }
}
