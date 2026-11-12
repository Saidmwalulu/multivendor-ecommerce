import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateProductDto } from "@repo/shared";
import { createProduct, updateProduct } from "../products";

export function useCreateProduct(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateProductDto) => createProduct(storeId, values),
    onSuccess: () => {
      // Refetches the seller's product list so the new draft shows up
      // without a full page reload.
      queryClient.invalidateQueries({ queryKey: ["store-products", storeId] });
    },
  });
}

export function useUpdateProduct(storeId: string, productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateProductDto) => updateProduct(storeId, productId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-products", storeId] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
    },
  });
}