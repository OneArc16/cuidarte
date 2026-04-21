import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";

import { AppModule } from "./app.module";

const DEFAULT_PORT = 3001;
const DEFAULT_WEB_ORIGIN = "http://localhost:5173";

function resolvePort(): number {
  const port = Number.parseInt(process.env.PORT ?? `${DEFAULT_PORT}`, 10);

  return Number.isNaN(port) ? DEFAULT_PORT : port;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV !== "test",
    }),
  );

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN,
    credentials: true,
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

  await app.listen(resolvePort(), "0.0.0.0");
}

void bootstrap();
