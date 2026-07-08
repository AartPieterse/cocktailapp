import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IngredientsService } from '../ingredients/ingredients.service';
import { CocktailIngredientDto } from './dto/cocktail-ingredient.dto';
import { CocktailSearchDto } from './dto/cocktail-search.dto';
import { CreateCocktailDto } from './dto/create-cocktail.dto';
import { UpdateCocktailDto } from './dto/update-cocktail.dto';
import { Cocktail, CocktailDocument, CocktailIngredient } from './schemas/cocktail.schema';

@Injectable()
export class CocktailsService {
  constructor(
    @InjectModel(Cocktail.name)
    private readonly cocktailModel: Model<CocktailDocument>,
    private readonly ingredientsService: IngredientsService,
  ) {}

  findAll(q?: string, tag?: string) {
    const filter: Record<string, unknown> = {};
    if (q) {
      filter.name = { $regex: q, $options: 'i' };
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

  /**
   * "What can I make with what I have": return cocktails whose every ingredient
   * is in the supplied available set (i.e. none of their ingredients is unavailable).
   */
  search(dto: CocktailSearchDto) {
    const availableIds = dto.availableIngredientIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    return this.cocktailModel
      .find({
        ingredients: { $not: { $elemMatch: { ingredientId: { $nin: availableIds } } } },
      })
      .sort({ name: 1 })
      .exec();
  }

  /** Resolve each ingredient line to a stable catalog id + canonical name. */
  private async resolveIngredients(
    lines: CocktailIngredientDto[] = [],
  ): Promise<CocktailIngredient[]> {
    return Promise.all(
      lines.map(async (line) => {
        const ingredient = await this.ingredientsService.findOrCreateByName(line.name);
        return {
          ingredientId: ingredient._id as Types.ObjectId,
          name: ingredient.name,
          amount: line.amount,
          unit: line.unit,
        };
      }),
    );
  }
}
