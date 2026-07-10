import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import type { AdminMetrics } from '@cocktailapp/shared';
import { AdminGuard } from './admin.guard';
import { AnalyticsService } from './analytics.service';
import { MetricsService } from './metrics.service';

/**
 * LAN-only admin surface (see {@link AdminGuard}). Exposes the aggregate product analytics and the
 * in-process operational metrics as JSON, plus a tiny self-contained HTML dashboard so the owner
 * can eyeball usage from a browser on the home network. Never mapped into the Cloudflare Tunnel.
 */
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly metrics: MetricsService,
  ) {}

  @Get('metrics')
  async metricsJson(): Promise<AdminMetrics> {
    return {
      analytics: await this.analytics.summary(30),
      operational: this.metrics.snapshot(),
    };
  }

  @Get('dashboard')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async dashboard(): Promise<string> {
    const { analytics, operational } = await this.metricsJson();
    const rows = (items: { id: string; count: number }[]) =>
      items.map((t) => `<tr><td>${escapeHtml(t.id)}</td><td>${t.count}</td></tr>`).join('') ||
      '<tr><td colspan="2">—</td></tr>';
    const totals = Object.entries(analytics.totals)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${v}</td></tr>`)
      .join('') || '<tr><td colspan="2">—</td></tr>';

    return `<!doctype html><html lang="nl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Barkast · admin</title>
<style>
  body{font:15px/1.5 system-ui,sans-serif;margin:0;padding:24px;background:#16130f;color:#f4efe6}
  h1{font-size:22px;margin:0 0 4px} .muted{color:#a79e90}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:20px 0}
  .card{background:#1e1a15;border:1px solid #322b22;border-radius:12px;padding:16px}
  .stat{font-size:28px;font-weight:800;color:#e0745a}
  table{width:100%;border-collapse:collapse} td{padding:6px 0;border-bottom:1px solid #322b22}
  td:last-child{text-align:right;color:#e0745a;font-weight:700}
  h2{font-size:16px;margin:0 0 8px}
</style></head><body>
<h1>Barkast admin</h1>
<p class="muted">Anonieme, geaggregeerde statistieken · laatste ${analytics.days} dagen · alleen op het lokale netwerk.</p>
<div class="grid">
  <div class="card"><div class="stat">${operational.requests}</div><div class="muted">requests</div></div>
  <div class="card"><div class="stat">${operational.errors}</div><div class="muted">errors</div></div>
  <div class="card"><div class="stat">${operational.avgLatencyMs} ms</div><div class="muted">gem. latency</div></div>
  <div class="card"><div class="stat">${Math.round(operational.uptimeSeconds / 3600)} u</div><div class="muted">uptime</div></div>
</div>
<div class="grid">
  <div class="card"><h2>Events</h2><table>${totals}</table></div>
  <div class="card"><h2>Populairste cocktails</h2><table>${rows(analytics.topCocktails)}</table></div>
  <div class="card"><h2>Meest toegevoegde ingrediënten</h2><table>${rows(analytics.topIngredients)}</table></div>
</div>
</body></html>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}
