import { Inject, Injectable } from "@nestjs/common";

import { AlimentacionFormatoExportService } from "../../alimentacion/application/alimentacion-formato-export.service";
import {
  ALIMENTACION_REPOSITORY,
  type AlimentacionRepository,
} from "../../alimentacion/domain/alimentacion.repository";
import {
  buildAlimentacionReportPdfFilename,
  deduplicateFilename,
} from "../domain/report-filenames";
import {
  type ReportAvailability,
  type ReportDocument,
  type ReportScope,
  type ReportSource,
} from "../domain/report.types";
import { type AuthUser } from "@cuidarte/contracts";

@Injectable()
export class AlimentacionReportSource implements ReportSource {
  constructor(
    @Inject(ALIMENTACION_REPOSITORY)
    private readonly alimentacionRepository: AlimentacionRepository,
    private readonly formatoExportService: AlimentacionFormatoExportService,
  ) {}

  async count(scope: ReportScope, period: string): Promise<ReportAvailability> {
    const candidates = await this.findCandidates(scope.tenantId, period);

    return {
      ...scope,
      type: "FORMATOS_ENTREGA_ALIMENTACION",
      period,
      availableDocuments: candidates.length,
      generatedDocuments: candidates.length,
      importedDocuments: 0,
    };
  }

  async *documents(
    scope: ReportScope,
    period: string,
    actor: AuthUser,
  ): AsyncIterable<ReportDocument> {
    const candidates = await this.findCandidates(scope.tenantId, period);
    const usedFilenames = new Set<string>();

    for (const candidate of candidates) {
      const filenameInput = {
        documentNumber: candidate.documentNumber,
        names: candidate.names,
        surnames: candidate.surnames,
        period: candidate.deliveryMonth,
      };
      const filename = deduplicateFilename(
        buildAlimentacionReportPdfFilename(filenameInput),
        usedFilenames,
      );

      const file = await this.formatoExportService.exportPdf(
        candidate.adultoMayorId,
        { deliveryMonth: candidate.deliveryMonth },
        actor,
      );

      yield {
        filename,
        buffer: file.buffer,
        contentType: "application/pdf",
      };
    }
  }

  private async findCandidates(tenantId: string, period: string) {
    if (this.alimentacionRepository.findFormatoEntregaReportCandidates === undefined) {
      throw new Error("La fuente de reportes de alimentacion no esta disponible.");
    }

    return await this.alimentacionRepository.findFormatoEntregaReportCandidates({
      tenantId,
      deliveryMonth: period,
    });
  }
}
