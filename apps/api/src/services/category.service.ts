import { prisma } from '../config/database';
import { uploadImageFromSource, deleteImage } from './upload.service';
import { NotFoundError, ConflictError, BadRequestError } from '../errors';
import { CreateCategoryInput, UpdateCategoryInput } from '@repo/shared';

const CATEGORY_FOLDER = 'auth-system/categories';

export async function createCategory(input: CreateCategoryInput) {
  const { secureUrl, publicId } = await uploadImageFromSource(input.image, {
    folder: CATEGORY_FOLDER,
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
  });

  const category = await prisma.category.create({
    data: {
      name: input.name,
      featured: input.featured,
      url: input.url,
      image: secureUrl,
      imagePublicId: publicId,
    },
  });

  return category;
}

export async function listCategories(filters: { featured?: boolean; includeSubCategories?: boolean }) {
  const categories = await prisma.category.findMany({
    where: {
      ...(filters.featured !== undefined ? { featured: filters.featured } : {}),
    },
    include: { subCategories: filters.includeSubCategories ?? false },
    orderBy: { createdAt: 'desc' },
  });

  return categories;
}

export async function getCategoryById(id: string, includeSubCategories = true) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { subCategories: includeSubCategories },
  });

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  return category;
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Category not found');
  }

  let imageFields: { image: string; imagePublicId: string } | undefined;

  if (input.image) {
    const { secureUrl, publicId } = await uploadImageFromSource(input.image, {
      folder: CATEGORY_FOLDER,
      transformation: [{ width: 800, height: 800, crop: 'limit' }],
    });
    imageFields = { image: secureUrl, imagePublicId: publicId };
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.url !== undefined ? { url: input.url } : {}),
      ...(input.featured !== undefined ? { featured: input.featured } : {}),
      ...(imageFields ?? {}),
    },
  });

  // Only delete the old Cloudinary asset after the DB update succeeds,
  // so a failed update never leaves the category pointing at a deleted image.
  if (imageFields) {
    await deleteImage(existing.imagePublicId);
  }

  return category;
}

export async function deleteCategory(id: string) {
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { subCategories: true } } },
  });

  if (!existing) {
    throw new NotFoundError('Category not found');
  }

  if (existing._count.subCategories > 0) {
    throw new ConflictError('Delete or reassign this category\'s subcategories before deleting it');
  }

  await prisma.category.delete({ where: { id } });
  await deleteImage(existing.imagePublicId);
}
