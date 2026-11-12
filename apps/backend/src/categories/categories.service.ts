import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateCategoryDto, UpdateCategoryDto } from '@repo/shared';
import { decodeImageDataUri } from '../common/utils/decode-image.util';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService, private cloudinary: CloudinaryService) {}

  // "image" can be a base64 data URI (upload it ourselves) or an already-hosted
  // URL (store it as-is). We only track an imageId (Cloudinary public_id) for
  // images we uploaded ourselves — that's what lets us clean them up later.
  private async resolveImage(image: string): Promise<{ url: string; imageId: string | null }> {
    if (image.startsWith('data:image/')) {
      const { buffer } = decodeImageDataUri(image);
      const { url, publicId } = await this.cloudinary.uploadImage(buffer);
      return { url, imageId: publicId };
    }
    return { url: image, imageId: null };
  }

  async create(dto: CreateCategoryDto) {
    const [existingName, existingUrl] = await Promise.all([
      this.prisma.category.findUnique({ where: { name: dto.name } }),
      this.prisma.category.findUnique({ where: { url: dto.url } }),
    ]);
    if (existingName) throw new ConflictException('Category name already exists');
    if (existingUrl) throw new ConflictException('Category URL slug already exists');

    const { url: imageUrl, imageId } = await this.resolveImage(dto.image);

    return this.prisma.category.create({
      data: {
        name: dto.name,
        image: imageUrl,
        imageId,
        url: dto.url,
        featured: dto.featured,
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async findByUrl(url: string) {
    const category = await this.prisma.category.findUnique({ where: { url } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    if (dto.name && dto.name !== category.name) {
      const existingName = await this.prisma.category.findUnique({ where: { name: dto.name } });
      if (existingName) throw new ConflictException('Category name already exists');
    }
    if (dto.url && dto.url !== category.url) {
      const existingUrl = await this.prisma.category.findUnique({ where: { url: dto.url } });
      if (existingUrl) throw new ConflictException('Category URL slug already exists');
    }

    let imageUpdate: { image?: string; imageId?: string | null } = {};
    if (dto.image) {
      // Replacing an image we previously uploaded — clean up the old one
      if (category.imageId) await this.cloudinary.deleteImage(category.imageId);
      const { url: imageUrl, imageId } = await this.resolveImage(dto.image);
      imageUpdate = { image: imageUrl, imageId };
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.url && { url: dto.url }),
        ...(dto.featured !== undefined && { featured: dto.featured }),
        ...imageUpdate,
      },
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    if (category.imageId) await this.cloudinary.deleteImage(category.imageId);
    await this.prisma.category.delete({ where: { id } });

    return { message: 'Category deleted successfully' };
  }
}
