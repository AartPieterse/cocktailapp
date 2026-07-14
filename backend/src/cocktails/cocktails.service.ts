import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  Cocktail as CocktailType,
  MakeableResult,
} from '@cocktailapp/shared';
import { computeMakeable, slugify } from '@cocktailapp/shared';
import { Model } from 'mongoose';
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
    const cocktail = await this.cocktailModel.findById(id).exec();
    if (!cocktail) {
      throw new NotFoundException(`Cocktail ${id} not found`);
    }
    return cocktail;
  }

  async create(dto: CreateCocktailDto) {
    const ingredients = await this.resolveIngredients(dto.ingredients);
    return this.cocktailModel.create({
      _id: slugify(dto.name),
      ...dto,
      ingredients,
    });
  }

  async update(id: string, dto: UpdateCocktailDto) {
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
    const deleted = await this.cocktailModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Cocktail ${id} not found`);
    }
  }

  /** Return a random cocktail (for "Verras me"). */
  async random(): Promise<CocktailType> {
    const [doc] = await this.cocktailModel
      .aggregate<Record<string, unknown>>([{ $sample: { size: 1 } }])
      .exec();
    if (!doc) {
      throw new NotFoundException('Er zijn nog geen cocktails');
    }
    return this.cocktailModel.hydrate(doc).toJSON() as CocktailType;
  }

  /**
   * The flagship "what can I make with what I have" search — now running the SINGLE shared
   * `computeMakeable` engine (the same one the web client uses) over the ~90 cocktails loaded
   * from Mongo, instead of a separate Mongo `$aggregate` pipeline. This keeps the backend byte-for-
   * byte in agreement with the offline bundle: same slug id space, same optional/garnish/seasoning
   * rules, same "X or Y" alternatives handling, same ordering.
   */
  async makeable(dto: MakeableSearchDto): Promise<MakeableResult[]> {
    const docs = await this.cocktailModel
      .find({ 'ingredients.0': { $exists: true } })
      .exec();
    const cocktails = docs.map((d) => d.toJSON() as CocktailType);
    return computeMakeable(
      cocktails,
      dto.availableIngredientIds,
      dto.maxMissing ?? 0,
    );
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
          ...(line.call ? { call: line.call } : {}),
          ...(line.amount !== undefined ? { amount: line.amount } : {}),
          ...(line.amountMax !== undefined ? { amountMax: line.amountMax } : {}),
          unit: line.unit,
          ...(line.note ? { note: line.note } : {}),
          ...(line.optional !== undefined ? { optional: line.optional } : {}),
          ...(line.role ? { role: line.role } : {}),
          ...(line.alternativeIds?.length
            ? { alternativeIds: line.alternativeIds }
            : {}),
        } as CocktailIngredient;
      }),
    );
  }
}
