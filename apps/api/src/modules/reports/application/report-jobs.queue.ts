import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, type Job, type JobsOptions } from "bullmq";
import IORedis from "ioredis";

import { getEnv } from "../../../config/env";

const REPORTS_QUEUE_NAME = "reports-generation";
const REPORTS_QUEUE_JOB_NAME = "generate-report";

export type ReportJobAttemptContext = {
  attempt: number;
  maxAttempts: number;
};

export type ReportJobProcessor = (
  reportId: string,
  context: ReportJobAttemptContext,
) => Promise<void>;

@Injectable()
export class ReportJobsQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ReportJobsQueue.name);
  private readonly connection: IORedis;
  private readonly queue: Queue<{ reportId: string }>;
  private readonly worker: Worker<{ reportId: string }>;
  private processor: ReportJobProcessor | null = null;
  private workerStarted = false;

  constructor() {
    const env = getEnv();
    const defaultJobOptions: JobsOptions = {
      attempts: env.REPORT_QUEUE_ATTEMPTS,
      backoff: {
        type: "exponential",
        delay: env.REPORT_QUEUE_BACKOFF_MS,
      },
      removeOnComplete: true,
      removeOnFail: {
        age: 24 * 60 * 60,
        count: 1000,
      },
    };

    this.connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
    this.queue = new Queue(REPORTS_QUEUE_NAME, {
      connection: this.connection,
      defaultJobOptions,
    });
    this.worker = new Worker(
      REPORTS_QUEUE_NAME,
      async (job: Job<{ reportId: string }>) => {
        if (this.processor === null) {
          throw new Error("El procesador de reportes no esta registrado.");
        }

        await this.processor(job.data.reportId, {
          attempt: job.attemptsMade + 1,
          maxAttempts: resolveJobAttempts(job, env.REPORT_QUEUE_ATTEMPTS),
        });
      },
      {
        autorun: false,
        concurrency: env.REPORT_QUEUE_CONCURRENCY,
        connection: this.connection,
      },
    );

    this.worker.on("completed", (job) => {
      this.logger.log(`reportId=${job.data.reportId} event=queue_completed`);
    });
    this.worker.on("failed", (job, error) => {
      this.logger.error(
        `reportId=${job?.data.reportId ?? "unknown"} event=queue_failed attemptsMade=${job?.attemptsMade ?? "unknown"} reason=${error.message}`,
      );
    });
    this.worker.on("stalled", (jobId) => {
      this.logger.warn(`reportId=${jobId} event=queue_stalled`);
    });
    this.worker.on("error", (error) => {
      this.logger.error(`event=queue_worker_error reason=${error.message}`, error.stack);
    });

    this.logger.log(
      `queue=${REPORTS_QUEUE_NAME} event=queue_configured concurrency=${env.REPORT_QUEUE_CONCURRENCY}`,
    );
  }

  registerProcessor(processor: ReportJobProcessor): void {
    this.processor = processor;
    if (!this.workerStarted) {
      this.workerStarted = true;
      void this.worker.run();
    }
  }

  async enqueue(reportId: string): Promise<void> {
    const existingJob = await this.queue.getJob(reportId);

    if (existingJob !== undefined && existingJob !== null) {
      const state = await existingJob.getState();

      if (state !== "completed" && state !== "failed") {
        return;
      }

      await existingJob.remove();
    }

    await this.queue.add(REPORTS_QUEUE_JOB_NAME, { reportId }, { jobId: reportId });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.connection.quit();
  }
}

function resolveJobAttempts(job: Job, fallback: number): number {
  const attempts = job.opts.attempts;

  return typeof attempts === "number" && attempts > 0 ? attempts : fallback;
}
