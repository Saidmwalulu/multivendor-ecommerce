import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  image: z.string().min(1, 'Image is required'), // base64 data URI
  url: z
    .string()
    .trim()
    .min(1, 'URL slug is required')
    .regex(/^[a-z0-9-]+$/, 'URL can only contain lowercase letters, numbers, and hyphens'),
  featured: z.boolean(),
});

// Same rules as create, but every field is optional and image is no longer
// required — you're often updating just the name or featured flag.
export const updateCategorySchema = createCategorySchema
  .partial()
  .extend({
    image: z.string().min(1, 'Image is required').optional(),
  });
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;