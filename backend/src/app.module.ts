import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { CocktailsModule } from './cocktails/cocktails.module';
import { CfThrottlerGuard } from './common/cf-throttler.guard';
import { IngredientsModule } from './ingredients/ingredients.module';
import { MeModule } from './me/me.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Basic rate limiting: 120 requests / minute / IP (real client IP via CfThrottlerGuard).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    IngredientsModule,
    CocktailsModule,
    CatalogModule,
    UsersModule,
    AuthModule,
    MeModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: CfThrottlerGuard }],
})
export class AppModule {}
