import type { AnalyticsIngestEvent, AnalyticsIngestRequest } from '@cocktailapp/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// Ids are catalog slugs; event types are short snake_case tokens. Bounds reject junk/abuse.
const SLUG = /^[a-z0-9-]{1,120}$/;
const EVENT_TYPE = /^[a-z0-9_]{1,40}$/;

export class AnalyticsEventDto implements AnalyticsIngestEvent {
  @IsString()
  @Matches(EVENT_TYPE, { message: 'ongeldig event type' })
  type: string;

  @IsOptional()
  @IsString()
  @Matches(SLUG, { message: 'ongeldig cocktailId' })
  @MaxLength(120)
  cocktailId?: string;

  @IsOptional()
  @IsString()
  @Matches(SLUG, { message: 'ongeldig ingredientId' })
  @MaxLength(120)
  ingredientId?: string;
}

/** Body of POST /api/events — a small batch of anonymous events. */
export class IngestEventsDto implements AnalyticsIngestRequest {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AnalyticsEventDto)
  events: AnalyticsEventDto[];
}
