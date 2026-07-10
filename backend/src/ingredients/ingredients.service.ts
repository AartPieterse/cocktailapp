import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { IngredientCategory } from '@cocktailapp/shared';
import { slugify } from '@cocktailapp/shared';
import { Model } from 'mongoose';
import {
  Cocktail,
  CocktailDocument,
} from '../cocktails/schemas/cocktail.schema';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { Ingredient, IngredientDocument } from './schemas/ingredient.schema';

/** Case-insensitive collation so "Gin" and "gin" are treated as the same name. */
const CI = { locale: 'en', strength: 2 } as const;

@Injectable()
export class IngredientsService {
  constructor(
    @InjectModel(Ingredient.name)
    private readonly ingredientModel: Model<IngredientDocument>,
    @InjectModel(Cocktail.name)
    private readonly cocktailModel: Model<CocktailDocument>,
  ) {}

  findAll(category?: IngredientCategory) {
    const filter = category ? { category } : {};
    return this.ingredientModel
      .find(filter)
      .sort({ name: 1 })
      .collation(CI)
      .exec();
  }

  create(dto: CreateIngredientDto) {
    const name = dto.name.trim();
    return this.ingredientModel.create({ _id: slugify(name), ...dto, name });
  }

  async update(id: string, dto: UpdateIngredientDto) {
    const patch = dto.name ? { ...dto, name: dto.name.trim() } : dto;
    const updated = await this.ingredientModel
      .findByIdAndUpdate(id, patch, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Ingredient ${id} not found`);
    }

    // Keep denormalized names in cocktail ingredient lines in sync on rename.
    if (patch.name) {
      await this.cocktailModel
        .updateMany(
          { 'ingredients.ingredientId': updated._id },
          { $set: { 'ingredients.$[line].name': updated.name } },
          { arrayFilters: [{ 'line.ingredientId': updated._id }] },
        )
        .exec();
    }
    return updated;
  }

  async remove(id: string) {
    // Guard referential integrity: refuse to orphan cocktail recipes.
    const usedBy = await this.cocktailModel
      .countDocuments({ 'ingredients.ingredientId': id })
      .exec();
    if (usedBy > 0) {
      throw new ConflictException(
        `Ingredient wordt gebruikt in ${usedBy} cocktail${usedBy === 1 ? '' : 's'} en kan niet worden verwijderd.`,
      );
    }
    const deleted = await this.ingredientModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Ingredient ${id} not found`);
    }
  }

  /**
   * Resolve an ingredient name to a catalog document, creating it if needed with an authored slug
   * id. Case-insensitive so casing typos don't spawn duplicate catalog entries.
   */
  findOrCreateByName(name: string) {
    const trimmed = name.trim();
    return this.ingredientModel
      .findOneAndUpdate(
        { name: trimmed },
        { $setOnInsert: { _id: slugify(trimmed), name: trimmed } },
        { upsert: true, new: true, collation: CI },
      )
      .exec();
  }
}
