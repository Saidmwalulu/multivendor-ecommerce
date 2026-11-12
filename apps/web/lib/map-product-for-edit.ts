// lib/map-product-for-edit.ts
import type { ExistingProduct } from "@/components/dashboard/forms/product-form/add-product-form";

// Backend shape (images: {id,url,imageId,position}[], category: {id,name},
// variant.image: string) doesn't match what the form needs (images:
// {url}[], categoryId: string, variant.image: {url} | undefined).
export function mapProductForEdit(product: any): ExistingProduct {
  return {
    ...product,
    categoryId: product.category?.id ?? product.categoryId,
    subCategoryId: product.subCategory?.id ?? product.subCategoryId,
    images: product.images
      .slice()
      .sort((a: any, b: any) => a.position - b.position)
      .map((img: any) => ({ url: img.url })),
    variants: product.variants.map((v: any) => ({
      ...v,
      image: v.image ? { url: v.image } : undefined,
    })),
  };
}