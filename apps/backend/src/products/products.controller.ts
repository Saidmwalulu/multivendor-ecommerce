import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ProductFormSchema } from '@repo/shared';
import type { CreateProductDto, UpdateProductDto, ProductQueryDto, UpdateProductStatusDto } from '@repo/shared';
import { ProductQuerySchema, UpdateProductStatusSchema } from '@repo/shared';
import { ProductsService } from './products.service';

type AuthUser = { userId: string; role: Role };

@Controller('products')
export class ProductsController {
    constructor(private productsService: ProductsService) {}

  // Public — only ACTIVE products, e.g.
  // GET /products?categoryId=...&search=hoodie&minPrice=20&maxPrice=80&sortBy=price_asc&page=2
  @Get()
  async findAll(@Query(new ZodValidationPipe(ProductQuerySchema)) query: ProductQueryDto) {
    const { products, pagination } = await this.productsService.findAll(query);
    return { success: true, data: { products, pagination } };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return { success: true, data: { product } };
  }

  // Seller dashboard — includes DRAFT/ARCHIVED products, not just live ones
  @Get('seller/:storeId')
  @UseGuards(JwtAuthGuard)
  async findAllForStore(@CurrentUser() user: AuthUser, @Param('storeId') storeId: string) {
    const products = await this.productsService.findAllForStore(storeId, user.userId, user.role);
    return { success: true, data: { products } };
  }

   // Seller/admin — fetches a product regardless of status, for editing.
  // Use this instead of GET /products/:id when loading the edit form.
  @Get('seller/:storeId/:id')
  @UseGuards(JwtAuthGuard)
  async findOneForStore(
    @CurrentUser() user: AuthUser,
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    const product = await this.productsService.findOneForStore(storeId, id, user.userId, user.role);
    return { success: true, data: { product } };
  }

  @Post(':storeId')
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: AuthUser,
    @Param('storeId') storeId: string,
    @Body(new ZodValidationPipe(ProductFormSchema)) dto: CreateProductDto,
  ) {
    const product = await this.productsService.create(user.userId, user.role, storeId, dto);
    return { success: true, message: 'Product created as draft', data: { product } };
  }

  @Patch(':storeId/:id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ProductFormSchema)) dto: UpdateProductDto,
  ) {
    const product = await this.productsService.update(user.userId, user.role, storeId, id, dto);
    return { success: true, message: 'Product updated', data: { product } };
  }

  @Patch(':storeId/:id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProductStatusSchema)) dto: UpdateProductStatusDto,
  ) {
    const product = await this.productsService.updateStatus(user.userId, user.role, storeId, id, dto.status);
    return { success: true, message: 'Product status updated', data: { product } };
  }

  @Delete(':storeId/:id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('storeId') storeId: string,
    @Param('id') id: string,
  ) {
    const result = await this.productsService.remove(user.userId, user.role, storeId, id);
    return { success: true, ...result };
  }
}
