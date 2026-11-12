import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { StoresService } from '../stores/stores.service';
import { resolveImage } from '../common/utils/resolve-image.util';
import type { CreateProductDto, UpdateProductDto } from '@repo/shared';
import { Role, ProductStatus } from '@prisma/client';

const productInclude = {
  images: { orderBy: { position: 'asc' as const } },
  options: { include: { values: true } },
  variants: true,
  questions: true,
} as const;

@Injectable()
export class ProductsService {
    constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    private stores: StoresService,
  ) {}

  private async assertCategoryLinkage(categoryId: string, subCategoryId: string) {
    const [category, subCategory] = await Promise.all([
      this.prisma.category.findUnique({ where: { id: categoryId } }),
      this.prisma.subCategory.findUnique({ where: { id: subCategoryId } }),
    ]);
    if (!category) throw new BadRequestException('Category does not exist');
    if (!subCategory) throw new BadRequestException('Sub-category does not exist');
    if (subCategory.categoryId !== categoryId) {
      throw new BadRequestException('Sub-category does not belong to the given category');
    }
  }

  private async assertSkuAvailable(storeId: string, sku: string, excludeProductId?: string) {
    const existing = await this.prisma.product.findFirst({
      where: { storeId, sku, ...(excludeProductId && { id: { not: excludeProductId } }) },
    });
    if (existing) throw new ConflictException('A product with this SKU already exists in your store');
  }

  // sku is optional on the DTO (a seller can create a product before
  // deciding on one), but the DB column is NOT NULL — so an empty/missing
  // sku gets a generated one instead of failing. Derived from the product
  // name plus a short time-based suffix, which keeps it human-recognisable
  // while all-but-guaranteeing it won't collide within one store.
  private generateSku(name: string): string {
    const slug = name
      .trim()
      .slice(0, 20)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const suffix = Date.now().toString(36).toUpperCase();
    return `${slug || 'PRODUCT'}-${suffix}`;
  }

   private resolveSku(name: string, sku?: string): string {
    const trimmed = sku?.trim();
    return trimmed ? trimmed : this.generateSku(name);
  }

  // Every image is uploaded to Cloudinary (base64 data URI) or stored as-is
  // (already-hosted URL) via the same resolveImage() helper used everywhere
  // else — but here each result becomes its own ProductImage row, so the
  // Cloudinary public_id is tracked per image and can be individually
  // deleted on replace/remove, same guarantee category/store images have.
  private async resolveProductImages(images: { url: string }[]) {
    const resolved = await Promise.all(images.map((img) => resolveImage(this.cloudinary, img.url)));
    return resolved.map((img, position) => ({
      url: img.url,
      imageId: img.imageId,
      position,
    }));
  }

  private async deleteCloudinaryImages(imageIds: (string | null)[]) {
    const ids = imageIds.filter((id): id is string => Boolean(id));
    await Promise.all(ids.map((id) => this.cloudinary.deleteImage(id)));
  }

  async create(userId: string, role: Role, storeId: string, dto: CreateProductDto) {
    await this.stores.assertOwnerOrAdmin(storeId, userId, role);
    await this.assertCategoryLinkage(dto.categoryId, dto.subCategoryId);

    const sku = this.resolveSku(dto.name, dto.sku);
    await this.assertSkuAvailable(storeId, sku);

    const images = await this.resolveProductImages(dto.images);

    return this.prisma.product.create({
      data: {
        storeId,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        subCategoryId: dto.subCategoryId,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        chargeTax: dto.chargeTax,
        isOnSale: dto.isOnSale,
        saleEndDate: dto.saleEndDate ? new Date(dto.saleEndDate) : null,
        costPerItem: dto.costPerItem,
        sku,
        barcode: dto.barcode,
        trackQuantity: dto.trackQuantity,
        quantity: dto.quantity,
        continueSellingWhenOutOfStock: dto.continueSellingWhenOutOfStock,
        isPhysicalProduct: dto.isPhysicalProduct,
        weight: dto.weight,
        weightUnit: dto.weightUnit,
        keywords: dto.keywords,
        images: { create: images },
        questions: {
          create: dto.questions.map((q) => ({ question: q.question, answer: q.answer })),
        },
        options: {
          create: dto.options.map((opt) => ({
            name: opt.name,
            values: {
              create: opt.values
                .filter((v) => v.value.trim().length > 0)
                .map((v) => ({ value: v.value, swatch: v.swatch })),
            },
          })),
        },
        variants: {
          create: dto.variants.map((v) => ({
            optionValues: v.optionValues,
            name: v.name,
            description: v.description,
            image: v.image?.url,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            isOnSale: v.isOnSale,
            saleEndDate: v.saleEndDate ? new Date(v.saleEndDate) : null,
            quantity: v.quantity,
            sku: v.sku,
          })),
        },
      },
      include: productInclude,
    });
  }

  // Public browsing — DRAFT products never show up here regardless of filters.
  // Offset pagination is the right tool here (not cursor-based): product
  // catalogs are browsed by page number with filters/sort changing between
  // requests, not scrolled through an infinite, rarely-reordered feed.
  async findAll(filters: {
    storeId?: string;
    categoryId?: string;
    subCategoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy: 'newest' | 'price_asc' | 'price_desc';
    page: number;
    limit: number;
  }) {
    const where = {
      status: ProductStatus.ACTIVE,
      ...(filters.storeId && { storeId: filters.storeId }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.subCategoryId && { subCategoryId: filters.subCategoryId }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { keywords: { has: filters.search.toLowerCase() } },
        ],
      }),
      ...((filters.minPrice !== undefined || filters.maxPrice !== undefined) && {
        price: {
          ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
          ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
        },
      }),
    };

    const orderBy =
      filters.sortBy === 'price_asc'
        ? { price: 'asc' as const }
        : filters.sortBy === 'price_desc'
          ? { price: 'desc' as const }
          : { createdAt: 'desc' as const };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: productInclude });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // Seller-only — lets the owner see their own DRAFT/ARCHIVED products too,
  // not just what's live on the storefront.
  async findAllForStore(storeId: string, userId: string, role: Role) {
    await this.stores.assertOwnerOrAdmin(storeId, userId, role);
    return this.prisma.product.findMany({
      where: { storeId },
      include: {
        images: { orderBy: { position: 'asc' as const } },
        options: { include: { values: true } },
        variants: true,
        questions: true,
        category: { select: { id: true, name: true } }, // <-- must be here
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Seller/admin — the counterpart to findOne() for editing: returns the
  // product regardless of status (DRAFT/ARCHIVED included), but only to its
  // owner or an admin. This is what the "edit product" page should call,
  // not the public findOne().
  async findOneForStore(storeId: string, productId: string, userId: string, role: Role) {
    const store = await this.stores.assertOwnerOrAdmin(storeId, userId, role);
    const product = await this.prisma.product.findUnique({ where: { id: productId }, include: productInclude });
    if (!product || product.storeId !== store.id) throw new NotFoundException('Product not found');
    return product;
  }

  // Full-replace strategy: options/values/variants/questions/images are
  // deleted and recreated from the submitted payload rather than diffed
  // field-by-field — matches how the edit form resubmits the whole product
  // tree anyway. Old Cloudinary images we owned are deleted before the new
  // set is uploaded, so replacing photos never leaves orphaned assets behind.
  async update(userId: string, role: Role, storeId: string, productId: string, dto: UpdateProductDto) {
    const store = await this.stores.assertOwnerOrAdmin(storeId, userId, role);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });
    if (!product || product.storeId !== store.id) throw new NotFoundException('Product not found');

    await this.assertCategoryLinkage(dto.categoryId, dto.subCategoryId);

    // Blank sku on an edit means "leave it as-is" — falling back to
    // generateSku() here would silently change the product's SKU on every
    // save where the seller didn't touch that field, which is worse than
    // just keeping what's already there.
    const sku = dto.sku?.trim() || product.sku;
    if (sku !== product.sku) {
      await this.assertSkuAvailable(storeId, sku, productId);
    }

    const newImages = await this.resolveProductImages(dto.images);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId } });
      await tx.productOptionValue.deleteMany({ where: { option: { productId } } });
      await tx.productOption.deleteMany({ where: { productId } });
      await tx.productVariant.deleteMany({ where: { productId } });
      await tx.productQuestion.deleteMany({ where: { productId } });

      return tx.product.update({
        where: { id: productId },
        data: {
          name: dto.name,
          description: dto.description,
          categoryId: dto.categoryId,
          subCategoryId: dto.subCategoryId,
          price: dto.price,
          compareAtPrice: dto.compareAtPrice,
          chargeTax: dto.chargeTax,
          isOnSale: dto.isOnSale,
          saleEndDate: dto.saleEndDate ? new Date(dto.saleEndDate) : null,
          costPerItem: dto.costPerItem,
          sku: dto.sku,
          barcode: dto.barcode,
          trackQuantity: dto.trackQuantity,
          quantity: dto.quantity,
          continueSellingWhenOutOfStock: dto.continueSellingWhenOutOfStock,
          isPhysicalProduct: dto.isPhysicalProduct,
          weight: dto.weight,
          weightUnit: dto.weightUnit,
          keywords: dto.keywords,
          images: { create: newImages },
          questions: { create: dto.questions.map((q) => ({ question: q.question, answer: q.answer })) },
          options: {
            create: dto.options.map((opt) => ({
              name: opt.name,
              values: {
                create: opt.values
                  .filter((v) => v.value.trim().length > 0)
                  .map((v) => ({ value: v.value, swatch: v.swatch })),
              },
            })),
          },
          variants: {
            create: dto.variants.map((v) => ({
              optionValues: v.optionValues,
              name: v.name,
              description: v.description,
              image: v.image?.url,
              price: v.price,
              compareAtPrice: v.compareAtPrice,
              isOnSale: v.isOnSale,
              saleEndDate: v.saleEndDate ? new Date(v.saleEndDate) : null,
              quantity: v.quantity,
              sku: v.sku,
            })),
          },
        },
        include: productInclude,
      });
    });

    // Only after the transaction commits — if anything above failed, the old
    // images are still referenced and shouldn't be deleted from Cloudinary.
    await this.deleteCloudinaryImages(product.images.map((img) => img.imageId));

    return updated;
  }

  async remove(userId: string, role: Role, storeId: string, productId: string) {
    const store = await this.stores.assertOwnerOrAdmin(storeId, userId, role);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });
    if (!product || product.storeId !== store.id) throw new NotFoundException('Product not found');

    // Cascade in the schema handles images/options/values/variants/questions
    // rows, but Cloudinary assets live outside Postgres — clean those up too.
    await this.prisma.product.delete({ where: { id: productId } });
    await this.deleteCloudinaryImages(product.images.map((img) => img.imageId));

    return { message: 'Product deleted successfully' };
  }

  // Seller-controlled — unlike Store's admin-gated status, a seller decides
  // for themselves when a product goes from DRAFT to ACTIVE, or pulls it to
  // ARCHIVED. No approval workflow needed at the product level.
  async updateStatus(userId: string, role: Role, storeId: string, productId: string, status: ProductStatus) {
    const store = await this.stores.assertOwnerOrAdmin(storeId, userId, role);

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.storeId !== store.id) throw new NotFoundException('Product not found');

    return this.prisma.product.update({ where: { id: productId }, data: { status } });
  }
}
