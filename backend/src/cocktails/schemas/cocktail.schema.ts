import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type {
  BaseSpirit,
  CocktailIngredientRole,
  Difficulty,
  Glassware,
  MeasureUnit,
  Method,
} from '@cocktailapp/shared';
import {
  BASE_SPIRITS,
  DIFFICULTIES,
  GLASSWARE,
  MEASURE_UNITS,
  METHODS,
} from '@cocktailapp/shared';
import { HydratedDocument } from 'mongoose';

export type CocktailDocument = HydratedDocument<Cocktail>;

const INGREDIENT_ROLES: CocktailIngredientRole[] = [
  'ingredient',
  'garnish',
  'seasoning',
];

@Schema({ _id: false })
export class CocktailIngredient {
  /** The canonical *base* slug id — the only thing the cabinet and computeMakeable compare. */
  @Prop({ type: String, ref: 'Ingredient', required: true })
  ingredientId: string;

  @Prop({ required: true, trim: true })
  name: string;

  /** The recipe's verbatim wording ("London Dry Gin"); the detail screen shows `call ?? name`. */
  @Prop({ trim: true })
  call?: string;

  /** Amount is optional — top-up / decorative lines carry no number. */
  @Prop({ min: 0 })
  amount?: number;

  /** Upper bound for an authored range ("6–8"); `amount` holds the lower bound. */
  @Prop({ min: 0 })
  amountMax?: number;

  @Prop({ type: String, enum: [...MEASURE_UNITS], required: true })
  unit: MeasureUnit;

  @Prop({ trim: true })
  note?: string;

  @Prop({ default: false })
  optional?: boolean;

  /** `garnish`/`seasoning` never block "makeable". Defaults to `ingredient` when absent. */
  @Prop({ type: String, enum: INGREDIENT_ROLES, required: false })
  role?: CocktailIngredientRole;

  /** For a recipe "X or Y" line: any of these base ids also satisfies the line. */
  @Prop({ type: [String], default: undefined })
  alternativeIds?: string[];
}

const CocktailIngredientSchema =
  SchemaFactory.createForClass(CocktailIngredient);

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
  /** Authored, immutable slug id — the same id space the offline bundle uses. */
  @Prop({ type: String })
  _id: string;

  @Prop({ required: true, trim: true, index: true })
  name: string;

  @Prop({ trim: true, index: true })
  category?: string;

  /** Primary browse axis, derived from the dominant spirit line. */
  @Prop({ type: String, enum: [...BASE_SPIRITS], required: false })
  baseSpirit?: BaseSpirit;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: [String], default: [] })
  instructions: string[];

  @Prop({ type: [CocktailIngredientSchema], default: [] })
  ingredients: CocktailIngredient[];

  @Prop({ type: String, enum: [...GLASSWARE], required: false })
  glass?: Glassware;

  @Prop({ type: String, enum: [...METHODS], required: false })
  method?: Method;

  @Prop({ type: String, enum: [...DIFFICULTIES], required: false })
  difficulty?: Difficulty;

  @Prop({ trim: true })
  garnish?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ default: 1, min: 1 })
  servings: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  imageUrl?: string;
}

export const CocktailSchema = SchemaFactory.createForClass(Cocktail);

// Indexes for the filtered/searched paths.
CocktailSchema.index({ tags: 1 });
CocktailSchema.index({ 'ingredients.ingredientId': 1 });
