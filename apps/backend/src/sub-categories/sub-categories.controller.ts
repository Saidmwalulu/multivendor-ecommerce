import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SubCategoriesService } from './sub-categories.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import * as SubCat from '@repo/shared';

@Controller('sub-categories')
export class SubCategoriesController {
    constructor(private subCategoriesService: SubCategoriesService) {}

    // Public — e.g. GET /subcategories?categoryId=...&featured=true
    @Get()
    async findAll(
        @Query(new ZodValidationPipe(SubCat.subCategoryQuerySchema)) query: SubCat.SubCategoryQueryDto,
    ) {
        const subCategories = await this.subCategoriesService.findAll(query);
        return { success: true, data: { subCategories } };
    }

    @Get(':id')
    async findById(@Param('id') id: string) {
        const subCategory = await this.subCategoriesService.findById(id);
        return { success: true, data: { subCategory } };
    }

    @Get(':url')
    async findByUrl(@Param('url') url: string) {
        const subCategory = await this.subCategoriesService.findByUrl(url);
        return { success: true, data: { subCategory } };
    }

    @Post()
    @Roles(Role.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    async create(
        @Body(new ZodValidationPipe(SubCat.createSubCategorySchema)) dto: SubCat.CreateSubCategoryDto,
    ) {
        const subCategory = await this.subCategoriesService.create(dto);
        return { success: true, message: 'Sub-category created', data: { subCategory } };
    }

    @Patch(':id')
    @Roles(Role.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    async update(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(SubCat.updateSubCategorySchema)) dto: SubCat.UpdateSubCategoryDto,
    ) {
        const subCategory = await this.subCategoriesService.update(id, dto);
        return { success: true, message: 'Sub-category updated', data: { subCategory } };
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    async remove(@Param('id') id: string) {
        const result = await this.subCategoriesService.remove(id);
        return { success: true, ...result };
    }
}
