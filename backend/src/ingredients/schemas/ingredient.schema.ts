import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { IngredientCategory } from '@cocktailapp/shared';
import { INGREDIENT_CATEGORIES } from '@cocktailapp/shared';
import { HydratedDocument } from 'mongoose';

export type IngredientDocument = HydratedDocument<Ingredient>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, any>) => {
      delete ret._id;
      return ret;
    },
  },
})
export class Ingredient {
  /**
   * Authored, immutable slug id (e.g. `gin`, `white-rum`) — the SAME id space the offline bundle
   * uses, so a user's cabinet (stored as ingredient ids) stays valid across bundle ⇄ API. Stored as
   * the Mongo `_id` (a string, not an ObjectId); the `id` virtual surfaces it in JSON.
   */
  @Prop({ type: String })
  _id: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, enum: [...INGREDIENT_CATEGORIES], required: false })
  category?: IngredientCategory;

  @Prop({ default: false })
  isStaple: boolean;

  /** A broader base that may substitute this one (`cognac`.parentId = `brandy`). Opt-in expansion. */
  @Prop({ type: String, required: false })
  parentId?: string;

  /** Explicit acceptable swaps, used sparingly. */
  @Prop({ type: [String], default: undefined })
  substitutes?: string[];

  /** Folded spellings & brand names, kept for the search box. */
  @Prop({ type: [String], default: undefined })
  aliases?: string[];
}

export const IngredientSchema = SchemaFactory.createForClass(Ingredient);

// Case-insensitive unique name: "Gin" and "gin" collapse to one catalog entry, so
// availability matching never splits across duplicate ids. (collation strength 2 = case-insensitive)
IngredientSchema.index(
  { name: 1 },
  {
    unique: true,
    name: 'name_ci_unique',
    collation: { locale: 'en', strength: 2 },
  },
);

// Backs `GET /ingredients?category=…`, which filters by `category` and sorts by `name` under the
// case-insensitive collation (see IngredientsService.findAll). The index MUST carry the same
// collation, or Mongo can't use it for the collated query and falls back to a collection scan.
IngredientSchema.index(
  { category: 1, name: 1 },
  { name: 'category_name_ci', collation: { locale: 'en', strength: 2 } },
);
