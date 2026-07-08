import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // All routes are served under /api (e.g. http://localhost:3000/api/cocktails).
  app.setGlobalPrefix('api');

  // The Angular dev server runs on a different origin.
  app.enableCors();

  // Validate + strip unknown properties, and transform payloads into DTO classes
  // (needed for nested validation of cocktail ingredient lines).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`CocktailApp API listening on http://localhost:${port}/api`);
}
void bootstrap();
