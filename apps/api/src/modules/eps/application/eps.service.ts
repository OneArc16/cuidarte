import { epsListResponseSchema, type EpsOption } from "@cuidarte/contracts";
import { BadRequestException, Inject, Injectable } from "@nestjs/common";

import { EPS_REPOSITORY, type EpsRepository } from "../domain/eps.repository";
import { type ResolvedEps } from "../domain/eps.types";

@Injectable()
export class EpsService {
  constructor(
    @Inject(EPS_REPOSITORY)
    private readonly epsRepository: EpsRepository,
  ) {}

  async listActive(): Promise<EpsOption[]> {
    const records = await this.epsRepository.findActive();

    return epsListResponseSchema.parse({ eps: records }).eps;
  }

  async resolveForWrite(
    epsId: string | null,
    currentEpsId: string | null = null,
  ): Promise<ResolvedEps | null> {
    if (epsId === null) {
      return null;
    }

    const record = await this.epsRepository.findById(epsId);

    if (record === null) {
      throw new BadRequestException("La EPS seleccionada no existe.");
    }

    if (!record.isActive && record.id !== currentEpsId) {
      throw new BadRequestException("La EPS seleccionada no se encuentra activa.");
    }

    return { id: record.id, name: record.name };
  }
}
