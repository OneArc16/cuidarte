import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.url().default("http://localhost:5173"),
  DATABASE_URL: z
    .url()
    .default("postgres://cuidarte:cuidarte_dev_password@localhost:15432/cuidarte"),
  REDIS_URL: z.url().default("redis://localhost:6379"),
  SESSION_COOKIE_NAME: z.string().min(1).default("cuidarte_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  ACTIVIDADES_GRUPALES_UPLOADS_DIR: z.string().min(1).default("/tmp/cuidarte/actividades-grupales"),
  EMPLEADOS_SIGNATURES_DIR: z.string().min(1).default(".data/uploads/empleados-signatures"),
  ALIMENTACION_FORMATOS_DIR: z.string().min(1).default(".data/uploads/alimentacion-formatos"),
  REPORTS_DIR: z.string().min(1).default(".data/reports"),
  REPORT_JOB_STALE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  REPORT_QUEUE_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(2),
  REPORT_QUEUE_ATTEMPTS: z.coerce.number().int().positive().max(5).default(2),
  REPORT_QUEUE_BACKOFF_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30 * 1000),
  TENANT_ASSETS_DIR: z.string().min(1).default("/tmp/cuidarte/tenant-assets"),
  DOCUMENTS_UPLOADS_DIR: z.string().min(1).default(".data/uploads"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv === null) {
    cachedEnv = envSchema.parse(process.env);
  }

  return cachedEnv;
}
