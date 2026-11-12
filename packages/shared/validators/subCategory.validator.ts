import { z } from 'zod';
import { createCategorySchema, updateCategorySchema } from './category.validator';

export const createSubCategorySchema = createCategorySchema.extend({
  categoryId: z.string().min(1, 'Category is required'),
});

export const updateSubCategorySchema = updateCategorySchema.extend({
  categoryId: z.string().min(1, 'Category is required').optional(),
});

export const subCategoryQuerySchema = z.object({
  categoryId: z.string().min(1).optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

export type CreateSubCategoryDto = z.infer<typeof createSubCategorySchema>;
export type UpdateSubCategoryDto = z.infer<typeof updateSubCategorySchema>;
export type SubCategoryQueryDto = z.infer<typeof subCategoryQuerySchema>;
