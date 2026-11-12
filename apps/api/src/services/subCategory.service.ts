import { prisma } from '../config/database';
import { uploadImageFromSource, deleteImage } from './upload.service';
import { NotFoundError } from '../errors';
import { CreateSubCategoryInput, UpdateSubCategoryInput } from '@repo/shared';

const SUBCATEGORY_FOLDER = 'auth-system/subcategories';

async function assertCategoryExists(categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new NotFoundError('Category not found');
  }
}

export async function createSubCategory(input: CreateSubCategoryInput) {
  await assertCategoryExists(input.categoryId);

  const { secureUrl, publicId } = await uploadImageFromSource(input.image, {
    folder: SUBCATEGORY_FOLDER,
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
  });

  const subCategory = await prisma.subCategory.create({
    data: {
      name: input.name,
      featured: input.featured,
      categoryId: input.categoryId,
      url: input.url,
      image: secureUrl,
      imagePublicId: publicId,
    },
  });

  return subCategory;
}

export async function listSubCategories(filters: { categoryId?: string; featured?: boolean }) {
  const subCategories = await prisma.subCategory.findMany({
    where: {
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.featured !== undefined ? { featured: filters.featured } : {}),
    },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  return subCategories;
}

export async function getSubCategoryById(id: string) {
  const subCategory = await prisma.subCategory.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!subCategory) {
    throw new NotFoundError('Subcategory not found');
  }

  return subCategory;
}

export async function updateSubCategory(id: string, input: UpdateSubCategoryInput) {
  const existing = await prisma.subCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Subcategory not found');
  }

  if (input.categoryId) {
    await assertCategoryExists(input.categoryId);
  }

  let imageFields: { image: string; imagePublicId: string } | undefined;

  if (input.image) {
    const { secureUrl, publicId } = await uploadImageFromSource(input.image, {
      folder: SUBCATEGORY_FOLDER,
      transformation: [{ width: 800, height: 800, crop: 'limit' }],
    });
    imageFields = { image: secureUrl, imagePublicId: publicId };
  }

  const subCategory = await prisma.subCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.url !== undefined ? { url: input.url } : {}),
      ...(input.featured !== undefined ? { featured: input.featured } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(imageFields ?? {}),
    },
  });

  if (imageFields) {
    await deleteImage(existing.imagePublicId);
  }

  return subCategory;
}

export async function deleteSubCategory(id: string) {
  const existing = await prisma.subCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Subcategory not found');
  }

  await prisma.subCategory.delete({ where: { id } });
  await deleteImage(existing.imagePublicId);
}
