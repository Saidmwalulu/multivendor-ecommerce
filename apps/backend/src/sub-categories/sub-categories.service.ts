import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { decodeImageDataUri } from '../common/utils/decode-image.util';
import { CreateSubCategoryDto, SubCategoryQueryDto, UpdateSubCategoryDto } from '@repo/shared';

@Injectable()
export class SubCategoriesService {
    constructor(private prisma: PrismaService, private cloudinary: CloudinaryService) {}

  private async resolveImage(image: string): Promise<{ url: string; imageId: string | null }> {
    if (image.startsWith('data:image/')) {
      const { buffer } = decodeImageDataUri(image);
      const { url, publicId } = await this.cloudinary.uploadImage(buffer);
      return { url, imageId: publicId };
    }
    return { url: image, imageId: null };
  }

  private async assertCategoryExists(categoryId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new BadRequestException('Category does not exist');
  }

  async create(dto: CreateSubCategoryDto) {
    await this.assertCategoryExists(dto.categoryId);

    const existingUrl = await this.prisma.subCategory.findUnique({ where: { url: dto.url } });
    if (existingUrl) throw new ConflictException('Sub-category URL slug already exists');

    const existingName = await this.prisma.subCategory.findFirst({
      where: { categoryId: dto.categoryId, name: dto.name },
    });
    if (existingName) throw new ConflictException('Sub-category name already exists in this category');

    const { url: imageUrl, imageId } = await this.resolveImage(dto.image);

    return this.prisma.subCategory.create({
      data: {
        name: dto.name,
        image: imageUrl,
        imageId,
        url: dto.url,
        featured: dto.featured,
        categoryId: dto.categoryId,
      },
    });
  }

  // categoryId / featured filters come from subCategoryQuerySchema — both optional
  async findAll(filters: SubCategoryQueryDto) {
    return this.prisma.subCategory.findMany({
      where: {
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.featured !== undefined && { featured: filters.featured }),
      },
      include: {
      category: {
        select: { id: true, name: true },
      },
    },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const subCategory = await this.prisma.subCategory.findUnique({ where: { id } });
    if (!subCategory) throw new NotFoundException('Sub-category not found');
    return subCategory;
  }

  async findByUrl(url: string) {
    const subCategory = await this.prisma.subCategory.findUnique({ where: { url } });
    if (!subCategory) throw new NotFoundException('Sub-category not found');
    return subCategory;
  }

  async update(id: string, dto: UpdateSubCategoryDto) {
    const subCategory = await this.prisma.subCategory.findUnique({ where: { id } });
    if (!subCategory) throw new NotFoundException('Sub-category not found');

    if (dto.categoryId) await this.assertCategoryExists(dto.categoryId);

    if (dto.url && dto.url !== subCategory.url) {
      const existingUrl = await this.prisma.subCategory.findUnique({ where: { url: dto.url } });
      if (existingUrl) throw new ConflictException('Sub-category URL slug already exists');
    }

    if (dto.name && dto.name !== subCategory.name) {
      const existingName = await this.prisma.subCategory.findFirst({
        where: { categoryId: dto.categoryId ?? subCategory.categoryId, name: dto.name },
      });
      if (existingName) throw new ConflictException('Sub-category name already exists in this category');
    }

    let imageUpdate: { image?: string; imageId?: string | null } = {};
    if (dto.image) {
      if (subCategory.imageId) await this.cloudinary.deleteImage(subCategory.imageId);
      const { url: imageUrl, imageId } = await this.resolveImage(dto.image);
      imageUpdate = { image: imageUrl, imageId };
    }

    return this.prisma.subCategory.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.url && { url: dto.url }),
        ...(dto.featured !== undefined && { featured: dto.featured }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...imageUpdate,
      },
    });
  }

  async remove(id: string) {
    const subCategory = await this.prisma.subCategory.findUnique({ where: { id } });
    if (!subCategory) throw new NotFoundException('Sub-category not found');

    if (subCategory.imageId) await this.cloudinary.deleteImage(subCategory.imageId);
    await this.prisma.subCategory.delete({ where: { id } });

    return { message: 'Sub-category deleted successfully' };
  }
}
