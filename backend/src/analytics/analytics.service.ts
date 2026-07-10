import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { AnalyticsIngestEvent, AnalyticsSummary, AnalyticsTally } from '@cocktailapp/shared';
import { Model } from 'mongoose';
import { AnalyticsDay, AnalyticsDayDocument } from './schemas/analytics-day.schema';

/** UTC `YYYY-MM-DD` for a date (defaults to now). */
function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(AnalyticsDay.name)
    private readonly model: Model<AnalyticsDayDocument>,
  ) {}

  /**
   * Fold a batch of anonymous events into today's aggregate bucket with a single `$inc` upsert.
   * Nothing identifiable is stored — only counters keyed by event type and catalog slug.
   */
  async ingest(events: AnalyticsIngestEvent[]): Promise<void> {
    if (!events.length) return;
    const inc: Record<string, number> = {};
    const bump = (path: string) => {
      inc[path] = (inc[path] ?? 0) + 1;
    };
    for (const e of events) {
      bump(`events.${e.type}`);
      if (e.cocktailId) bump(`cocktails.${e.cocktailId}`);
      if (e.ingredientId) bump(`ingredients.${e.ingredientId}`);
    }
    await this.model
      .updateOne({ date: dayKey() }, { $inc: inc }, { upsert: true })
      .exec();
  }

  /** Aggregate the last `days` buckets into ranked tallies for the admin dashboard. */
  async summary(days = 30): Promise<AnalyticsSummary> {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));
    const docs = await this.model.find({ date: { $gte: dayKey(cutoff) } }).exec();

    const totals: Record<string, number> = {};
    const cocktails: Record<string, number> = {};
    const ingredients: Record<string, number> = {};
    const merge = (into: Record<string, number>, from?: Record<string, number>) => {
      for (const [k, v] of Object.entries(from ?? {})) into[k] = (into[k] ?? 0) + (v ?? 0);
    };
    for (const d of docs) {
      merge(totals, d.events);
      merge(cocktails, d.cocktails);
      merge(ingredients, d.ingredients);
    }

    const rank = (m: Record<string, number>, n = 10): AnalyticsTally[] =>
      Object.entries(m)
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
        .slice(0, n);

    return { days, totals, topCocktails: rank(cocktails), topIngredients: rank(ingredients) };
  }
}
