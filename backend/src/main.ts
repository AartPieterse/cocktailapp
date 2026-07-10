import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { MongoExceptionFilter } from './common/mongo-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind the Cloudflare Tunnel the socket peer is always cloudflared; trust the proxy hop so
  // Express resolves the real client IP (X-Forwarded-For / req.ip). Rate limiting additionally
  // prefers CF-Connecting-IP (see CfThrottlerGuard). Tune with TRUST_PROXY (default: 1 hop).
  app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

  // All routes are served under /api (e.g. http://localhost:3000/api/cocktails).
  app.setGlobalPrefix('api');

  // Sensible security headers.
  app.use(helmet());

  // CORS: an explicit allowlist in production (never reflect-any once we store PII); reflect any
  // origin only in development for convenience.
  const corsOrigin = process.env.CORS_ORIGIN;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !corsOrigin) {
    throw new Error(
      'CORS_ORIGIN must be set in production (comma-separated allowlist of the web origin).',
    );
  }
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'If-None-Match'],
    exposedHeaders: ['ETag'],
    maxAge: 86_400,
  });

  // Validate + strip unknown properties, and transform payloads into DTO classes
  // (needed for nested validation of cocktail ingredient lines).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Map Mongoose/Mongo errors to clean HTTP status codes.
  app.useGlobalFilters(new MongoExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  Logger.log(
    `Barkast API listening on http://localhost:${port}/api`,
    'Bootstrap',
  );
}
void bootstrap();
