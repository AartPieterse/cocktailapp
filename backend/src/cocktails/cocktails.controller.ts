import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CocktailsService } from './cocktails.service';
import { CocktailSearchDto } from './dto/cocktail-search.dto';
import { CreateCocktailDto } from './dto/create-cocktail.dto';
import { UpdateCocktailDto } from './dto/update-cocktail.dto';

@Controller('cocktails')
export class CocktailsController {
  constructor(private readonly cocktailsService: CocktailsService) {}

  @Get()
  findAll(@Query('q') q?: string, @Query('tag') tag?: string) {
    return this.cocktailsService.findAll(q, tag);
  }

  @Post('search')
  @HttpCode(200)
  search(@Body() dto: CocktailSearchDto) {
    return this.cocktailsService.search(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cocktailsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCocktailDto) {
    return this.cocktailsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCocktailDto) {
    return this.cocktailsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.cocktailsService.remove(id);
  }
}
