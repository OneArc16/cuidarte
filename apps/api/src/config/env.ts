import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.url().default("http://localhost:5173"),
  DATABASE_URL: z
    .url()
    .default("postgres://cuidarte:cuidarte_dev_password@localhost:5433/cuidarte"),
  SESSION_COOKIE_NAME: z.string().min(1).default("cuidarte_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  ACTIVIDADES_GRUPALES_UPLOADS_DIR: z.string().min(1).default("/tmp/cuidarte/actividades-grupales"),
  EMPLEADOS_SIGNATURES_DIR: z.string().min(1).default("/tmp/cuidarte/empleados-signatures"),
  ALIMENTACION_FORMATOS_DIR: z.string().min(1).default("/tmp/cuidarte/alimentacion-formatos"),
  TENANT_ASSETS_DIR: z.string().min(1).default("/tmp/cuidarte/tenant-assets"),
  ATENCIONES_INDIVIDUALES_UPLOADS_DIR: z
    .string()
    .min(1)
    .default("/tmp/cuidarte/atenciones-individuales"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv === null) {
    cachedEnv = envSchema.parse(process.env);
  }

  return cachedEnv;
}
