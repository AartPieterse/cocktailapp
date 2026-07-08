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
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ type: String, enum: [...INGREDIENT_CATEGORIES], required: false })
  category?: IngredientCategory;
}

export const IngredientSchema = SchemaFactory.createForClass(Ingredient);
