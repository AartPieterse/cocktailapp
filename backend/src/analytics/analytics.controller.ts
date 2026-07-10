import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';
import { IngestEventsDto } from './dto/ingest-events.dto';

@Controller('events')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /**
   * Ingest a batch of anonymous product events. No auth (the app is usable signed-out) and no
   * identifiers are stored — only aggregate counters are incremented. Returns 202 (accepted) since
   * ingestion is fire-and-forget from the client's perspective. Rate-limited per client IP.
   */
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post()
  @HttpCode(202)
  async ingest(@Body() dto: IngestEventsDto): Promise<void> {
    await this.analytics.ingest(dto.events);
  }
}
