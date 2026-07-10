import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';
import { AnalyticsDay, AnalyticsDaySchema } from './schemas/analytics-day.schema';

/**
 * Privacy-preserving analytics (Part E): anonymous aggregate product events (`POST /api/events`),
 * in-process operational metrics (a global interceptor), and the LAN-only admin dashboard/API.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: AnalyticsDay.name, schema: AnalyticsDaySchema }]),
  ],
  controllers: [AnalyticsController, AdminController],
  providers: [
    AnalyticsService,
    MetricsService,
    AdminGuard,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AnalyticsModule {}
