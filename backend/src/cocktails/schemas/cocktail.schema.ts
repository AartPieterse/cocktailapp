import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { MeasureUnit } from '@cocktailapp/shared';
import { MEASURE_UNITS } from '@cocktailapp/shared';
import { HydratedDocument, Types } from 'mongoose';

export type CocktailDocument = HydratedDocument<Cocktail>;

@Schema({ _id: false })
export class CocktailIngredient {
  @Prop({ type: Types.ObjectId, ref: 'Ingredient', required: true })
  ingredientId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ type: String, enum: [...MEASURE_UNITS], required: true })
  unit: MeasureUnit;
}

const CocktailIngredientSchema = SchemaFactory.createForClass(CocktailIngredient);

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
export class Cocktail {
  @Prop({ required: true, trim: true, index: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: [String], default: [] })
  instructions: string[];

  @Prop({ type: [CocktailIngredientSchema], default: [] })
  ingredients: CocktailIngredient[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  imageUrl?: string;
}

export const CocktailSchema = SchemaFactory.createForClass(Cocktail);
