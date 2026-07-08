import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  Cocktail as CocktailType,
  Difficulty,
  Glassware,
  MakeableResult,
  MeasureUnit,
  Method,
} from '@cocktailapp/shared';
import { Model, Types } from 'mongoose';
import { IngredientsService } from '../ingredients/ingredients.service';
import { CocktailIngredientDto } from './dto/cocktail-ingredient.dto';
import { CreateCocktailDto } from './dto/create-cocktail.dto';
import { MakeableSearchDto } from './dto/makeable-search.dto';
import { UpdateCocktailDto } from './dto/update-cocktail.dto';
import {
  Cocktail,
  CocktailDocument,
  CocktailIngredient,
} from './schemas/cocktail.schema';

/** Shape of a raw ingredient line as it comes back from an aggregation (ObjectId, not string). */
interface RawLine {
  ingredientId: Types.ObjectId;
  name: string;
  amount: number;
  unit: MeasureUnit;
  note?: string;
  optional?: boolean;
}

/** Shape of a raw cocktail document from an aggregation pipeline (bypasses schema toJSON). */
interface RawCocktailDoc {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  instructions?: string[];
  ingredients?: RawLine[];
  glass?: Glassware;
  method?: Method;
  difficulty?: Difficulty;
  garnish?: string;
  servings?: number;
  tags?: string[];
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Added by the makeable pipeline:
  missing?: RawLine[];
  missingCount?: number;
}

/** Escape user input so it is treated as a literal in a $regex (prevents 500s + ReDoS). */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class CocktailsService {
  constructor(
    @InjectModel(Cocktail.name)
    private readonly cocktailModel: Model<CocktailDocument>,
    private readonly ingredientsService: IngredientsService,
  ) {}

  findAll(q?: string, tag?: string) {
    const filter: Record<string, unknown> = {};
    if (q?.trim()) {
      filter.name = { $regex: escapeRegExp(q.trim()), $options: 'i' };
    }
    if (tag) {
      filter.tags = tag;
    }
    return this.cocktailModel.find(filter).sort({ name: 1 }).exec();
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Cocktail ${id} not found`);
    }
    const cocktail = await this.cocktailModel.findById(id).exec();
    if (!cocktail) {
      throw new NotFoundException(`Cocktail ${id} not found`);
    }
    return cocktail;
  }

  async create(dto: CreateCocktailDto) {
    const ingredients = await this.resolveIngredients(dto.ingredients);
    return this.cocktailModel.create({ ...dto, ingredients });
  }

  async update(id: string, dto: UpdateCocktailDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Cocktail ${id} not found`);
    }
    const patch: Record<string, unknown> = { ...dto };
    if (dto.ingredients) {
      patch.ingredients = await this.resolveIngredients(dto.ingredients);
    }
    const updated = await this.cocktailModel
      .findByIdAndUpdate(id, patch, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Cocktail ${id} not found`);
    }
    return updated;
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Cocktail ${id} not found`);
    }
    const deleted = await this.cocktailModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Cocktail ${id} not found`);
    }
  }

  /** Return a random cocktail (for "Verras me"). */
  async random(): Promise<CocktailType> {
    const [doc] = await this.cocktailModel
      .aggregate<RawCocktailDoc>([{ $sample: { size: 1 } }])
      .exec();
    if (!doc) {
      throw new NotFoundException('Er zijn nog geen cocktails');
    }
    return this.toCocktailJson(doc);
  }

  /**
   * The flagship "what can I make with what I have" search.
   * Returns cocktails ordered by how many *required* ingredients you are missing,
   * up to `maxMissing` (0 = makeable right now). Optional lines never count as missing,
   * and cocktails with no ingredients are excluded.
   */
  async makeable(dto: MakeableSearchDto): Promise<MakeableResult[]> {
    const availableIds = dto.availableIngredientIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    const maxMissing = dto.maxMissing ?? 0;

    const docs = await this.cocktailModel
      .aggregate<RawCocktailDoc>([
        { $match: { 'ingredients.0': { $exists: true } } },
        {
          $addFields: {
            missing: {
              $filter: {
                input: '$ingredients',
                as: 'i',
                cond: {
                  $and: [
                    { $ne: ['$$i.optional', true] },
                    { $not: [{ $in: ['$$i.ingredientId', availableIds] }] },
                  ],
                },
              },
            },
          },
        },
        { $addFields: { missingCount: { $size: '$missing' } } },
        { $match: { missingCount: { $lte: maxMissing } } },
        { $sort: { missingCount: 1, name: 1 } },
      ])
      .exec();

    return docs.map((doc) => ({
      cocktail: this.toCocktailJson(doc),
      missing: (doc.missing ?? []).map((m) => ({
        ingredientId: String(m.ingredientId),
        name: m.name,
      })),
      missingCount: doc.missingCount ?? 0,
    }));
  }

  /** Map a raw aggregation document into the same JSON shape as the schema's toJSON. */
  private toCocktailJson(doc: RawCocktailDoc): CocktailType {
    return {
      id: String(doc._id),
      name: doc.name,
      description: doc.description ?? '',
      instructions: doc.instructions ?? [],
      ingredients: (doc.ingredients ?? []).map((line) => ({
        ingredientId: String(line.ingredientId),
        name: line.name,
        amount: line.amount,
        unit: line.unit,
        note: line.note,
        optional: line.optional,
      })),
      glass: doc.glass,
      method: doc.method,
      difficulty: doc.difficulty,
      garnish: doc.garnish,
      servings: doc.servings ?? 1,
      tags: doc.tags ?? [],
      imageUrl: doc.imageUrl,
      createdAt: doc.createdAt?.toISOString(),
      updatedAt: doc.updatedAt?.toISOString(),
    };
  }

  /** Resolve each ingredient line to a stable catalog id + canonical name. */
  private async resolveIngredients(
    lines: CocktailIngredientDto[] = [],
  ): Promise<CocktailIngredient[]> {
    return Promise.all(
      lines.map(async (line) => {
        const ingredient = await this.ingredientsService.findOrCreateByName(
          line.name,
        );
        return {
          ingredientId: ingredient._id,
          name: ingredient.name,
          amount: line.amount,
          unit: line.unit,
          note: line.note,
          optional: line.optional ?? false,
        };
      }),
    );
  }
}
