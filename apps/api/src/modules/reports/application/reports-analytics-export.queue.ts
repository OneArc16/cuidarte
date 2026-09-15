import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { Job, Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { getEnv } from "../../../config/env";

export type AnalyticsExportProcessor = (id: string, attempt: number, maxAttempts: number) => Promise<void>;

@Injectable()
export class ReportsAnalyticsExportQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ReportsAnalyticsExportQueue.name);
  private readonly connection: IORedis;
  private readonly queue: Queue<{ exportId: string }>;
  private readonly worker: Worker<{ exportId: string }>;
  private processor: AnalyticsExportProcessor | null = null;
  private started = false;

  constructor() {
    const env = getEnv();
    this.connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
    this.queue = new Queue("reports-analytics-exports", { connection: this.connection, defaultJobOptions: { attempts: env.REPORT_QUEUE_ATTEMPTS, backoff: { type: "exponential", delay: env.REPORT_QUEUE_BACKOFF_MS }, removeOnComplete: true, removeOnFail: { age: 86400, count: 1000 } } });
    this.worker = new Worker("reports-analytics-exports", async (job: Job<{ exportId: string }>) => {
      if (!this.processor) throw new Error("El procesador de exportaciones no esta registrado.");
      await this.processor(job.data.exportId, job.attemptsMade + 1, job.opts.attempts ?? 1);
    }, { autorun: false, concurrency: env.REPORT_QUEUE_CONCURRENCY, connection: this.connection });
    this.worker.on("failed", (job, error) => this.logger.error(`exportId=${job?.data.exportId ?? "unknown"} event=analytics_export_failed reason=${error.message}`));
  }

  registerProcessor(processor: AnalyticsExportProcessor) { this.processor = processor; if (!this.started) { this.started = true; void this.worker.run(); } }
  async enqueue(exportId: string) { await this.queue.add("generate-analytics-export", { exportId }, { jobId: exportId }); }
  async onModuleDestroy() { await this.worker.close(); await this.queue.close(); await this.connection.quit(); }
}
