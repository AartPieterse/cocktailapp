import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { IngredientCategory } from '@cocktailapp/shared';
import { Model, Types } from 'mongoose';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { Ingredient, IngredientDocument } from './schemas/ingredient.schema';

@Injectable()
export class IngredientsService {
  constructor(
    @InjectModel(Ingredient.name)
    private readonly ingredientModel: Model<IngredientDocument>,
  ) {}

  findAll(category?: IngredientCategory) {
    const filter = category ? { category } : {};
    return this.ingredientModel.find(filter).sort({ name: 1 }).exec();
  }

  create(dto: CreateIngredientDto) {
    return this.ingredientModel.create({ ...dto, name: dto.name.trim() });
  }

  async update(id: string, dto: UpdateIngredientDto) {
    const patch = dto.name ? { ...dto, name: dto.name.trim() } : dto;
    const updated = await this.ingredientModel
      .findByIdAndUpdate(id, patch, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Ingredient ${id} not found`);
    }
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.ingredientModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Ingredient ${id} not found`);
    }
  }

  /**
   * Resolve an ingredient name to a catalog document, creating it if needed.
   * Used when saving a cocktail so every ingredient line carries a stable id.
   */
  findOrCreateByName(name: string) {
    const trimmed = name.trim();
    return this.ingredientModel
      .findOneAndUpdate(
        { name: trimmed },
        { $setOnInsert: { name: trimmed } },
        { upsert: true, new: true },
      )
      .exec();
  }

  toObjectId(id: string): Types.ObjectId | null {
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
  }
}
