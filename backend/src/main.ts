import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { MongoExceptionFilter } from './common/mongo-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // All routes are served under /api (e.g. http://localhost:3000/api/cocktails).
  app.setGlobalPrefix('api');

  // Sensible security headers.
  app.use(helmet());

  // Restrict CORS to configured origins in production; reflect any origin in dev.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
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
