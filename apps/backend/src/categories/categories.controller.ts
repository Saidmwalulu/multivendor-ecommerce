import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import * as Cat from '@repo/shared';

@Controller('categories')
export class CategoriesController {
    constructor(private categoriesService: CategoriesService) {}

  // Public — anyone browsing the store needs to see categories
  @Get()
  async findAll() {
    const categories = await this.categoriesService.findAll();
    return { success: true, data: { categories } };
  }

   @Get(':id')
  async findById(@Param('id') id: string) {
    const category = await this.categoriesService.findById(id);
    return { success: true, data: { category } };
  }

  @Get(':url')
  async findByUrl(@Param('url') url: string) {
    const category = await this.categoriesService.findByUrl(url);
    return { success: true, data: { category } };
  }

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async create(@Body(new ZodValidationPipe(Cat.createCategorySchema)) dto: Cat.CreateCategoryDto) {
    const category = await this.categoriesService.create(dto);
    return { success: true, message: 'Category created', data: { category } };
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(Cat.updateCategorySchema)) dto: Cat.UpdateCategoryDto,
  ) {
    const category = await this.categoriesService.update(id, dto);
    return { success: true, message: 'Category updated', data: { category } };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async remove(@Param('id') id: string) {
    const result = await this.categoriesService.remove(id);
    return { success: true, ...result };
  }
}
