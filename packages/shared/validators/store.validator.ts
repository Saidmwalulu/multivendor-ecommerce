import { z } from "zod";


const imageSchema = z.object({
  url: z.url("Invalid image URL"),
});

export const StoreFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Store name must be at least 2 characters long.")
    .max(50, "Store name cannot exceed 50 characters.")
    .regex(
      /^(?!.*(?:[-_ ]){2,})[a-zA-Z0-9_ -]+$/,
      "Only letters, numbers, spaces, hyphens, and underscores are allowed. Consecutive spaces, hyphens, or underscores are not permitted.",
    ),

  description: z
    .string()
    .trim()
    .min(30, "Store description must be at least 30 characters long.")
    .max(500, "Store description cannot exceed 500 characters."),

  email: z.email("Invalid email address."),

  phone: z
    .string()
    .trim()
    .regex(
      /^\+?\d{7,15}$/,
      "Phone number must contain 7 to 15 digits and may start with '+'.",
    ),

  logo: z.array(imageSchema).length(1, "Choose a logo image."),

  cover: z.array(imageSchema).length(1, "Choose a cover image."),

  url: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Store URL must be at least 2 characters long.")
    .max(50, "Store URL cannot exceed 50 characters.")
    .regex(
      /^(?!.*(?:[-_]){2,})[a-zA-Z0-9_-]+$/,
      "Only letters, numbers, hyphens, and underscores are allowed. Consecutive hyphens or underscores are not permitted.",
    ),

  featured: z.boolean().optional().default(false),

  status: z
    .enum(["PENDING", "ACTIVE", "BANNED", "DISABLED"])
    .optional()
    .default("PENDING"),
});

export const UpdateStoreFeaturedSchema = z.object({
  featured: z.boolean(),
});

export const UpdateStoreStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'BANNED', 'DISABLED']),
});

export type UpdateStoreStatusDto = z.infer<typeof UpdateStoreStatusSchema>;
export type UpdateStoreFeaturedDto = z.infer<typeof UpdateStoreFeaturedSchema>;
export type StoreFormDto = z.input<typeof StoreFormSchema>;
