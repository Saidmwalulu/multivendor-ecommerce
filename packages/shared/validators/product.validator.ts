// add-product.schema.ts
import * as z from "zod";

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;

export const WEIGHT_UNITS = ["kg", "g", "lb", "oz"] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const MAX_OPTIONS = 3;

export const SUGGESTED_OPTION_NAMES = [
  "Size",
  "Colour",
  "Material",
  "Style",
] as const;

// Product schema
//
// Only name, price, categoryId, and subCategoryId are truly required —
// matching how Shopify lets you create a product from just a title, then
// fill everything else in before publishing. Price stays required because
// an unsellable product isn't meaningfully a product yet; category/
// sub-category stay required because they're structural (where the product
// lives in the catalog), not descriptive content you'd naturally fill in
// later the way a description or images are.
export const ProductFormSchema = z
  .object({
    name: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? "Product name is mandatory."
            : "Product name must be a valid string.",
      })
      .min(2, {
        message: "Product name should be at least 2 characters long.",
      })
      .max(200, {
        message: "Product name cannot exceed 200 characters.",
      })
      .regex(/^(?!.*(?:[-_ ]){2,})[a-zA-Z0-9_ -]+$/, {
        message:
          "Product name may only contain letters, numbers, spaces, hyphens, and underscores, without consecutive special characters.",
      }),

    // No minimum length at creation — a draft can be saved with no
    // description and filled in before publishing.
    description: z
      .string({ error: "Product description must be a valid string." })
      .optional()
      .default(""),

    // No minimum image count at creation, same reasoning. Cap stays at 6.
    images: z
      .object({ url: z.string() })
      .array()
      .max(6, "You can upload up to 6 images for the product.")
      .optional()
      .default([]),

    categoryId: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? "Product category ID is mandatory."
            : "Product category ID must be a valid UUID.",
      })
      .uuid(),

    subCategoryId: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? "Product sub-category ID is mandatory."
            : "Product sub-category ID must be a valid UUID.",
      })
      .uuid(),

    // ---------------------------------------------------------------------
    // Pricing
    // ---------------------------------------------------------------------

    price: z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? "Price is mandatory."
            : "Price must be a valid number.",
      })
      .min(0.01, { message: "Price must be greater than 0." }),

    compareAtPrice: z
      .number({ error: "Compare-at price must be a valid number." })
      .min(0, { message: "Compare-at price cannot be negative." })
      .optional(),

    chargeTax: z.boolean().optional().default(true),

    isOnSale: z.boolean().optional().default(false),

    saleEndDate: z.string().optional(),

    costPerItem: z
      .number({ error: "Cost per item must be a valid number." })
      .min(0, { message: "Cost per item cannot be negative." })
      .optional(),

    // ---------------------------------------------------------------------
    // Inventory
    // ---------------------------------------------------------------------

    // Optional — Shopify auto-generates a SKU when one isn't provided
    // rather than blocking creation on it. The backend does the same here.
    sku: z
      .string({ error: "Product SKU must be a valid string." })
      .max(50, { message: "Product SKU cannot exceed 50 characters." })
      .optional(),

    barcode: z
      .string()
      .max(50, { message: "Barcode cannot exceed 50 characters." })
      .optional(),

    trackQuantity: z.boolean().optional().default(true),

    quantity: z
      .number({ error: "Quantity must be a valid number." })
      .int({ message: "Quantity must be a whole number." })
      .min(0, { message: "Quantity cannot be negative." })
      .optional()
      .default(0),

    continueSellingWhenOutOfStock: z.boolean().optional().default(false),

    // ---------------------------------------------------------------------
    // Shipping
    // ---------------------------------------------------------------------

    isPhysicalProduct: z.boolean().optional().default(true),

    // No longer forced even when isPhysicalProduct is true — weight only
    // actually matters at shipping-rate calculation time, not creation time.
    weight: z
      .number({ error: "Weight must be a valid number." })
      .min(0, { message: "Weight cannot be negative." })
      .optional(),

    weightUnit: z.enum(WEIGHT_UNITS).optional().default("kg"),

    // ---------------------------------------------------------------------
    // Misc
    // ---------------------------------------------------------------------

    // No minimum count — SEO keywords are an optimization you add before
    // publishing, not a blocker to saving a draft.
    keywords: z
      .string({ error: "Keywords must be valid strings." })
      .array()
      .max(10, { message: "You can provide up to 10 keywords." })
      .optional()
      .default([]),

    // No longer requires at least one question. If a row IS provided, both
    // sides must be filled — half-filled Q&A pairs are still rejected.
    questions: z
      .object({
        question: z.string(),
        answer: z.string(),
      })
      .array()
      .max(10, { message: "You can provide up to 10 questions." })
      .optional()
      .default([])
      .refine(
        (questions) =>
          questions.every((q) => q.question.trim().length > 0 && q.answer.trim().length > 0),
        { message: "Remove any question or answer left blank." },
      ),

    // ---------------------------------------------------------------------
    // Variants — already optional; unchanged
    // ---------------------------------------------------------------------

    options: z
      .object({
        name: z
          .string()
          .min(1, { message: "Option name is required." })
          .max(50, { message: "Option name cannot exceed 50 characters." }),
        values: z
          .object({
            value: z.string(),
            swatch: z.string().optional(),
          })
          .array()
          .refine((values) => values.some((v) => v.value.trim().length > 0), {
            message: "Add at least one value for this option.",
          }),
      })
      .array()
      .max(MAX_OPTIONS, {
        message: `A product can have at most ${MAX_OPTIONS} options.`,
      })
      .optional()
      .default([])
      .refine(
        (options) => {
          const names = options.map((o) => o.name.trim().toLowerCase());
          return new Set(names).size === names.length;
        },
        { message: "Option names must be unique." },
      ),

    variants: z
      .object({
        optionValues: z.string().array(),
        name: z
          .string()
          .max(100, { message: "Variant name cannot exceed 100 characters." })
          .optional(),
        description: z
          .string()
          .max(500, { message: "Variant description cannot exceed 500 characters." })
          .optional(),
        image: z.object({ url: z.string() }).optional(),
        price: z
          .number({ error: "Variant price must be a valid number." })
          .min(0.01, { message: "Variant price must be greater than 0." }),
        compareAtPrice: z
          .number({ error: "Compare-at price must be a valid number." })
          .min(0, { message: "Compare-at price cannot be negative." })
          .optional(),
        isOnSale: z.boolean().optional().default(false),
        saleEndDate: z.string().optional(),
        quantity: z
          .number({ error: "Variant quantity must be a valid number." })
          .int({ message: "Quantity must be a whole number." })
          .min(0, { message: "Quantity cannot be negative." }),
        sku: z
          .string()
          .max(50, { message: "SKU cannot exceed 50 characters." })
          .optional(),
      })
      .array()
      .optional()
      .default([]),
  })
  .superRefine((values, ctx) => {
    if (
      values.compareAtPrice !== undefined &&
      values.compareAtPrice > 0 &&
      values.compareAtPrice <= values.price
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["compareAtPrice"],
        message: "Compare-at price must be higher than the price.",
      });
    }

    // Weight-required-when-physical check removed — see comment on the
    // `weight` field above.

    if (values.options.length > 0 && values.variants.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Add at least one value per option to generate variants.",
      });
    }

    const seenSkus = new Set<string>();

    values.variants.forEach((variant, index) => {
      const sku = variant.sku?.trim().toLowerCase();
      if (sku) {
        if (seenSkus.has(sku)) {
          ctx.addIssue({
            code: "custom",
            path: ["variants", index, "sku"],
            message: "This SKU is already used by another variant.",
          });
        }
        seenSkus.add(sku);
      }

      if (
        variant.compareAtPrice !== undefined &&
        variant.compareAtPrice > 0 &&
        variant.compareAtPrice <= variant.price
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "compareAtPrice"],
          message: "Compare-at price must be higher than the price.",
        });
      }
    });
  });

export const UpdateProductStatusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
});

export const ProductQuerySchema = z
  .object({
    storeId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    subCategoryId: z.string().uuid().optional(),
    search: z.string().trim().min(1).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sortBy: z.enum(["newest", "price_asc", "price_desc"]).optional().default("newest"),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).optional().default(PAGE_SIZE_DEFAULT),
  })
  .refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
    message: "minPrice must not be greater than maxPrice",
    path: ["minPrice"],
  });

export type ProductQueryDto = z.infer<typeof ProductQuerySchema>;
export type UpdateProductStatusDto = z.infer<typeof UpdateProductStatusSchema>;
export type CreateProductDto = z.infer<typeof ProductFormSchema>;
export type UpdateProductDto = z.infer<typeof ProductFormSchema>;
export type ProductFormInput = z.input<typeof ProductFormSchema>;
export type ProductFormOutput = z.output<typeof ProductFormSchema>;