import { Injectable } from '@nestjs/common';
import type { OperationalMetrics } from '@cocktailapp/shared';

/**
 * In-process operational metrics: request count, error count, rolling average latency, uptime.
 * Fed by {@link MetricsInterceptor} and read by the LAN admin dashboard. Deliberately lightweight
 * (no Prometheus/Grafana for v1 — that's a later option per the plan).
 */
@Injectable()
export class MetricsService {
  private readonly startedAt = new Date();
  private requests = 0;
  private errors = 0;
  private totalLatencyMs = 0;

  record(latencyMs: number, isError: boolean): void {
    this.requests += 1;
    this.totalLatencyMs += latencyMs;
    if (isError) this.errors += 1;
  }

  snapshot(): OperationalMetrics {
    return {
      startedAt: this.startedAt.toISOString(),
      uptimeSeconds: Math.round((Date.now() - this.startedAt.getTime()) / 1000),
      requests: this.requests,
      errors: this.errors,
      avgLatencyMs: this.requests ? Math.round(this.totalLatencyMs / this.requests) : 0,
    };
  }
}
