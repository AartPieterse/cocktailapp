import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AnalyticsDayDocument = HydratedDocument<AnalyticsDay>;

/**
 * One aggregate bucket per UTC day. There is deliberately NO raw event document and NO identifier
 * anywhere — only counters. `events`/`cocktails`/`ingredients` are id→count maps incremented with
 * `$inc`, so the collection size is bounded by (days × distinct ids), never by traffic volume.
 */
@Schema({ collection: 'analytics', timestamps: false })
export class AnalyticsDay {
  /** UTC day, `YYYY-MM-DD`. One doc per day. */
  @Prop({ required: true, unique: true, index: true })
  date: string;

  /** Per-event-type totals, e.g. `{ cocktail_view: 42, cabinet_add: 17 }`. */
  @Prop({ type: Object, default: {} })
  events: Record<string, number>;

  /** Per-cocktail tallies (views/surprises/favorites), keyed by catalog slug. */
  @Prop({ type: Object, default: {} })
  cocktails: Record<string, number>;

  /** Per-ingredient tallies (cabinet adds), keyed by catalog slug. */
  @Prop({ type: Object, default: {} })
  ingredients: Record<string, number>;
}

export const AnalyticsDaySchema = SchemaFactory.createForClass(AnalyticsDay);
