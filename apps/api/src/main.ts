import "reflect-metadata";

import fastifyMultipart from "@fastify/multipart";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";

import { AppModule } from "./app.module";
import { getEnv } from "./config/env";

type AddressInUseError = NodeJS.ErrnoException & {
  address?: string;
  port?: number;
};

const bootstrapLogger = new Logger("Bootstrap");

function isAddressInUseError(error: unknown): error is AddressInUseError {
  return error instanceof Error && "code" in error && error.code === "EADDRINUSE";
}

async function bootstrap(): Promise<void> {
  const env = getEnv();
  let app: NestFastifyApplication | null = null;

  try {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter({
        logger: env.NODE_ENV !== "test",
      }),
    );
    await app.register(fastifyMultipart as never, {
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 6,
        fields: 10,
      },
    });

    app.setGlobalPrefix("api");
    app.enableCors({
      origin: env.WEB_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Accept"],
    });
    app.enableShutdownHooks();

    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("Cuidarte API")
        .setDescription("API multi-tenant para Centros de Vida de Ancianos.")
        .setVersion("0.1.0")
        .build(),
    );

    SwaggerModule.setup("api/docs", app, document);

    await app.listen(env.PORT, "0.0.0.0");
  } catch (error) {
    if (app !== null) {
      await app.close().catch(() => undefined);
    }

    if (isAddressInUseError(error)) {
      bootstrapLogger.error(
        `El puerto ${env.PORT} ya está en uso. Detén la instancia anterior o ejecuta "pnpm dev:free-ports" y vuelve a iniciar la API.`,
      );
      process.exitCode = 1;
      return;
    }

    throw error;
  }
}

void bootstrap();
