import { type AuthUser } from "@cuidarte/contracts";
import { Inject, Injectable } from "@nestjs/common";

import { ActividadesGrupalesActaExportService } from "../../actividades-grupales/application/actividades-grupales-acta-export.service";
import {
  ACTIVIDADES_GRUPALES_REPOSITORY,
  type ActividadesGrupalesRepository,
} from "../../actividades-grupales/domain/actividades-grupales.repository";
import { buildActaReportPdfFilename, deduplicateFilename } from "../domain/report-filenames";
import {
  type ReportAvailability,
  type ReportDocument,
  type ReportScope,
  type ReportSource,
  type ReportJobRecord,
} from "../domain/report.types";

@Injectable()
export class ActividadesGrupalesReportSource implements ReportSource {
  constructor(
    @Inject(ACTIVIDADES_GRUPALES_REPOSITORY)
    private readonly actividadesRepository: ActividadesGrupalesRepository,
    private readonly actaExportService: ActividadesGrupalesActaExportService,
  ) {}

  async count(
    scope: ReportScope,
    period: string,
    filters?: ReportJobRecord["activityFilters"],
  ): Promise<ReportAvailability> {
    const candidates = await this.findCandidates(scope.tenantId, period, filters);

    return {
      ...scope,
      type: "ACTAS_SESIONES_GRUPALES",
      period,
      availableDocuments: candidates.length,
    };
  }

  async *documents(
    scope: ReportScope,
    period: string,
    actor: AuthUser,
    filters?: ReportJobRecord["activityFilters"],
  ): AsyncIterable<ReportDocument> {
    const candidates = await this.findCandidates(scope.tenantId, period, filters);
    const usedFilenames = new Set<string>();

    for (const candidate of candidates) {
      const filename = deduplicateFilename(
        buildActaReportPdfFilename({
          activityDate: candidate.activityDate,
          actaNumber: candidate.actaNumber,
          descriptor: candidate.activityName,
        }),
        usedFilenames,
      );
      const file = await this.actaExportService.exportPdf(candidate.id, actor);

      yield {
        filename,
        buffer: file.buffer,
        contentType: "application/pdf",
      };
    }
  }

  private async findCandidates(
    tenantId: string,
    period: string,
    filters?: ReportJobRecord["activityFilters"],
  ) {
    if (this.actividadesRepository.findActaReportCandidates === undefined) {
      throw new Error("La fuente de reportes de actas no esta disponible.");
    }

    return await this.actividadesRepository.findActaReportCandidates({
      tenantId,
      period,
      search: filters?.search ?? null,
      activityTypeId: filters?.activityTypeId ?? null,
      organizer: filters?.organizer ?? null,
    });
  }
}
