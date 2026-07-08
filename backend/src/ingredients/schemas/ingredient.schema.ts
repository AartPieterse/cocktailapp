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
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, enum: [...INGREDIENT_CATEGORIES], required: false })
  category?: IngredientCategory;

  @Prop({ default: false })
  isStaple: boolean;
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
