import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { csrfProtectionMiddleware } from './security/csrf';

const DEFAULT_CORS_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
const DEFAULT_JSON_BODY_LIMIT = '256kb';
const DEFAULT_FORM_BODY_LIMIT = '64kb';

function allowedCorsOrigins() {
  const configuredOrigins =
    process.env.CORS_ALLOWED_ORIGINS ?? process.env.FRONTEND_ORIGIN;

  if (!configuredOrigins) {
    return DEFAULT_CORS_ALLOWED_ORIGINS;
  }

  const origins = configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return origins.length > 0 ? origins : DEFAULT_CORS_ALLOWED_ORIGINS;
}

function corsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (allowedCorsOrigins().includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error('Origin is not allowed by CORS'), false);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.enableCors({
    credentials: true,
    origin: corsOrigin,
  });
  app.use(json({ limit: process.env.JSON_BODY_LIMIT ?? DEFAULT_JSON_BODY_LIMIT }));
  app.use(
    urlencoded({
      extended: true,
      limit: process.env.FORM_BODY_LIMIT ?? DEFAULT_FORM_BODY_LIMIT,
    }),
  );
  app.use(csrfProtectionMiddleware);
  app.setGlobalPrefix('api');
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/api/uploads/',
  });
  await app.listen(process.env.BACKEND_PORT ?? 4000);
}

void bootstrap();
