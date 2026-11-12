// hooks/use-subcategories.ts
import { useQuery } from "@tanstack/react-query";
import type { CategoryOption } from "@/components/dashboard/forms/product-form/add-product-form";
import { getSubCategories } from "../sub-category";

export function useSubCategories(categoryId?: string) {
  return useQuery<CategoryOption[]>({
    queryKey: ["subcategories", categoryId],
    queryFn: () => getSubCategories(categoryId),
    enabled: Boolean(categoryId),
  });
}