import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser, type ReportStatus } from "@cuidarte/contracts";

import { type ReportArchiveWriter } from "../domain/report-archive-writer";
import { type ReportFilesStorage, type StoredReportFile } from "../domain/report-files.storage";
import { type ReportJobRecord, type ReportSource } from "../domain/report.types";
import { type ReportsRepository } from "../domain/reports.repository";
import { ReportsService } from "./reports.service";

const actor: AuthUser = {
  id: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  email: "admin@centro.test",
  fullName: "Admin Centro",
  role: "admin",
  passwordSetByAdmin: false,
};

describe("ReportsService job recovery", () => {
  it("runs the normal lifecycle from pending to ready", async () => {
    const harness = createHarness({
      documents: ["uno.pdf", "dos.pdf"],
    });

    await harness.service.processReport(harness.report.id);

    assert.equal(harness.report.status, "ready");
    assert.equal(harness.report.processedDocuments, 2);
    assert.equal(harness.report.storageKey, "report-1/final.zip");
    assert.equal(harness.storage.deletedTemporaryFiles, 1);
  });

  it("preserves cancelled when cancellation happens during processing", async () => {
    const harness = createHarness({
      documents: ["uno.pdf", "dos.pdf"],
      cancelAfterProcessedDocuments: 1,
    });

    await harness.service.processReport(harness.report.id);

    assert.equal(harness.report.status, "cancelled");
    assert.equal(harness.storage.deletedStorageKeys.includes("report-1/final.zip"), true);
    assert.equal(harness.storage.deletedTemporaryFiles, 2);
  });

  it("marks failed after the last failed attempt", async () => {
    const harness = createHarness({
      documents: ["uno.pdf"],
      writerError: new Error("zip write failed"),
    });

    await harness.service.processReport(harness.report.id, { attempt: 2, maxAttempts: 2 });

    assert.equal(harness.report.status, "failed");
    assert.equal(harness.report.errorCode, "REPORT_RETRY_EXHAUSTED");
    assert.equal(harness.storage.deletedTemporaryFiles, 2);
  });

  it("throws without marking failed when BullMQ still has attempts left", async () => {
    const harness = createHarness({
      documents: ["uno.pdf"],
      writerError: new Error("temporary pdf failure"),
    });

    await assert.rejects(
      harness.service.processReport(harness.report.id, { attempt: 1, maxAttempts: 2 }),
      /temporary pdf failure/,
    );

    assert.equal(harness.report.status, "processing");
    assert.equal(harness.report.errorCode, null);
  });

  it("reenqueues pending and stale processing reports during recovery", async () => {
    const harness = createHarness({
      documents: ["uno.pdf"],
      recoverableReports: [
        createReportRecord({ id: "pending-report", status: "pending" }),
        createReportRecord({ id: "stale-report", status: "processing" }),
      ],
    });

    await harness.service["recoverAbandonedReports"]();

    assert.deepEqual(harness.queue.enqueuedReportIds, ["pending-report", "stale-report"]);
    assert.equal(harness.storage.deletedTemporaryFiles, 2);
  });

  it("retries a stale processing report without duplicating the final zip", async () => {
    const harness = createHarness({
      documents: Array.from({ length: 400 }, (_, index) => `documento-${index + 1}.pdf`),
      initialStatus: "processing",
    });

    harness.report.processedDocuments = 149;
    await harness.service.processReport(harness.report.id, { attempt: 1, maxAttempts: 2 });

    assert.equal(harness.report.status, "ready");
    assert.equal(harness.report.processedDocuments, 400);
    assert.equal(harness.storage.committedStorageKeys.length, 1);
    assert.deepEqual(harness.storage.committedStorageKeys, ["report-1/final.zip"]);
  });

  it("returns an active duplicate without enqueueing another report", async () => {
    const duplicate = createReportRecord({ id: "duplicate-report", status: "processing" });
    const harness = createHarness({
      documents: ["uno.pdf"],
      duplicateReport: duplicate,
    });

    const response = await harness.service.createReport(
      { type: duplicate.type, period: duplicate.period, tenantId: duplicate.tenantId },
      actor,
    );

    assert.equal(response.id, duplicate.id);
    assert.deepEqual(harness.queue.enqueuedReportIds, []);
  });
});

type HarnessOptions = {
  documents: string[];
  initialStatus?: ReportStatus;
  writerError?: Error;
  cancelAfterProcessedDocuments?: number;
  recoverableReports?: ReportJobRecord[];
  duplicateReport?: ReportJobRecord;
};

function createHarness(options: HarnessOptions) {
  const report = createReportRecord({ status: options.initialStatus ?? "pending" });
  const repository = new InMemoryReportsRepository(
    report,
    options.recoverableReports ?? [],
    options.cancelAfterProcessedDocuments ?? null,
    options.duplicateReport ?? null,
  );
  const storage = new InMemoryReportFilesStorage();
  const writer = new InMemoryArchiveWriter(options.writerError ?? null);
  const alimentacionSource = new StaticReportSource(options.documents);
  const actividadesSource = new StaticReportSource(options.documents);
  const queue = new InMemoryReportJobsQueue();
  const service = new ReportsService(
    repository,
    storage,
    writer,
    alimentacionSource as never,
    actividadesSource as never,
    queue as never,
  );

  return {
    report,
    repository,
    storage,
    writer,
    queue,
    service,
  };
}

function createReportRecord(overrides: Partial<ReportJobRecord> = {}): ReportJobRecord {
  const now = new Date("2026-09-14T14:08:50.000Z");

  return {
    id: "report-1",
    filterKey: "",
    activityFilters: { search: null, activityTypeId: null, organizer: null },
    tenantId: actor.tenantId!,
    tenantName: "Centro Demo",
    requestedByUserId: actor.id,
    requestedByRole: actor.role,
    type: "FORMATOS_ENTREGA_ALIMENTACION",
    period: "2026-08",
    status: "pending",
    totalDocuments: null,
    processedDocuments: 0,
    failedDocuments: 0,
    storageKey: null,
    downloadFilename: "reporte.zip",
    errorCode: null,
    expiresAt: null,
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

class InMemoryReportsRepository implements ReportsRepository {
  readonly auditActions: string[] = [];

  constructor(
    private readonly report: ReportJobRecord,
    private readonly recoverableReports: ReportJobRecord[],
    private readonly cancelAfterProcessedDocuments: number | null,
    private readonly duplicateReport: ReportJobRecord | null,
  ) {}

  async findTenantById(): Promise<{ id: string; name: string } | null> {
    return { id: this.report.tenantId, name: this.report.tenantName };
  }

  async findActiveDuplicate(): Promise<ReportJobRecord | null> {
    return this.duplicateReport;
  }

  async createJob(): Promise<ReportJobRecord> {
    return this.report;
  }

  async findJobById(reportId: string): Promise<ReportJobRecord | null> {
    return reportId === this.report.id ? this.report : null;
  }

  async findExpiredReadyJobs(): Promise<ReportJobRecord[]> {
    return [];
  }

  async findRecoverableJobs(): Promise<ReportJobRecord[]> {
    return this.recoverableReports;
  }

  async listJobs(): Promise<ReportJobRecord[]> {
    return [this.report];
  }

  async markProcessing(reportId: string, startedAt: Date): Promise<ReportJobRecord | null> {
    if (
      reportId !== this.report.id &&
      this.recoverableReports.every((job) => job.id !== reportId)
    ) {
      return null;
    }

    this.report.status = "processing";
    this.report.processedDocuments = 0;
    this.report.failedDocuments = 0;
    this.report.startedAt = startedAt;
    this.report.completedAt = null;
    this.report.updatedAt = startedAt;

    return this.report;
  }

  async setTotalDocuments(_reportId: string, totalDocuments: number): Promise<void> {
    this.report.totalDocuments = totalDocuments;
  }

  async updateProgress(
    _reportId: string,
    processedDocuments: number,
    failedDocuments: number,
  ): Promise<void> {
    this.report.processedDocuments = processedDocuments;
    this.report.failedDocuments = failedDocuments;
    this.report.updatedAt = new Date();

    if (this.cancelAfterProcessedDocuments === processedDocuments) {
      this.report.status = "cancelled";
    }
  }

  async markFinished(command: {
    status: "ready" | "empty";
    totalDocuments: number;
    processedDocuments: number;
    failedDocuments: number;
    storageKey: string | null;
    expiresAt: Date | null;
    completedAt: Date;
  }): Promise<ReportJobRecord | null> {
    this.report.status = command.status;
    this.report.totalDocuments = command.totalDocuments;
    this.report.processedDocuments = command.processedDocuments;
    this.report.failedDocuments = command.failedDocuments;
    this.report.storageKey = command.storageKey;
    this.report.expiresAt = command.expiresAt;
    this.report.completedAt = command.completedAt;
    this.report.updatedAt = command.completedAt;

    return this.report;
  }

  async markFailed(_reportId: string, errorCode: string, completedAt: Date): Promise<void> {
    this.report.status = "failed";
    this.report.errorCode = errorCode;
    this.report.completedAt = completedAt;
    this.report.updatedAt = completedAt;
  }

  async cancel(_reportId: string, completedAt: Date): Promise<ReportJobRecord | null> {
    this.report.status = "cancelled";
    this.report.completedAt = completedAt;
    this.report.updatedAt = completedAt;

    return this.report;
  }

  async expireReadyJobs(): Promise<void> {}

  async createAudit(command: { action: string }): Promise<void> {
    this.auditActions.push(command.action);
  }
}

class InMemoryReportFilesStorage implements ReportFilesStorage {
  deletedStorageKeys: string[] = [];
  committedStorageKeys: string[] = [];
  deletedTemporaryFiles = 0;

  async reserve(): Promise<{
    storageKey: string;
    absolutePath: string;
    temporaryPath: string;
  }> {
    return {
      storageKey: "report-1/final.zip",
      absolutePath: "/reports/report-1/final.zip",
      temporaryPath: "/reports/report-1/final.zip.part",
    };
  }

  async commit(
    _temporaryPath: string,
    absolutePath: string,
    storageKey: string,
  ): Promise<StoredReportFile> {
    this.committedStorageKeys.push(storageKey);

    return {
      storageKey,
      absolutePath,
      sizeBytes: 123,
    };
  }

  async read(): Promise<{ absolutePath: string; sizeBytes: number }> {
    return {
      absolutePath: "/reports/report-1/final.zip",
      sizeBytes: 123,
    };
  }

  async delete(storageKey: string): Promise<void> {
    this.deletedStorageKeys.push(storageKey);
  }

  async deleteTemporaryFiles(): Promise<number> {
    this.deletedTemporaryFiles += 1;
    return 1;
  }
}

class InMemoryArchiveWriter implements ReportArchiveWriter {
  constructor(private readonly error: Error | null) {}

  async writeZip(entries: AsyncIterable<{ filename: string; buffer: Buffer }>): Promise<number> {
    let count = 0;

    for await (const _entry of entries) {
      count += 1;
    }

    if (this.error !== null) {
      throw this.error;
    }

    return count;
  }
}

class StaticReportSource implements ReportSource {
  constructor(private readonly filenames: string[]) {}

  async count() {
    return {
      tenantId: actor.tenantId!,
      tenantName: "Centro Demo",
      type: "FORMATOS_ENTREGA_ALIMENTACION" as const,
      period: "2026-08",
      availableDocuments: this.filenames.length,
    };
  }

  async *documents(): AsyncIterable<{
    filename: string;
    buffer: Buffer;
    contentType: "application/pdf";
  }> {
    for (const filename of this.filenames) {
      yield {
        filename,
        buffer: Buffer.from(filename),
        contentType: "application/pdf",
      };
    }
  }
}

class InMemoryReportJobsQueue {
  readonly enqueuedReportIds: string[] = [];

  registerProcessor(): void {}

  async enqueue(reportId: string): Promise<void> {
    this.enqueuedReportIds.push(reportId);
  }
}
