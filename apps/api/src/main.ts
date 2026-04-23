import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";

import { AppModule } from "./app.module";
import { getEnv } from "./config/env";

async function bootstrap(): Promise<void> {
  const env = getEnv();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: env.NODE_ENV !== "test",
    }),
  );

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
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
}

void bootstrap();
