"use client";

import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getProductForStore } from "@/lib/products";
import { mapProductForEdit } from "@/lib/map-product-for-edit";
import { AddProductForm, type CategoryOption } from "@/components/dashboard/forms/product-form/add-product-form";

interface ProductEditSheetProps {
  productId: string;
  storeId: string;
  storeURL: string;
  categories: CategoryOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductEditSheet({
  productId,
  storeId,
  storeURL,
  categories,
  open,
  onOpenChange,
}: ProductEditSheetProps) {
  // enabled: open — only fetches once the sheet is actually opened, not on
  // every table render, and re-fetches fresh data each time it's reopened.
  const { data: product, isLoading } = useQuery({
    queryKey: ["product-edit", storeId, productId],
    queryFn: () => getProductForStore(storeId, productId),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Fixed height (not just max-h) + flex column so AddProductForm's
          internal h-full/flex-1 scroll region has something real to
          resolve against. DialogContent itself no longer scrolls — only
          the form body inside AddProductForm does — which is what lets
          the bottom bar stay pinned instead of scrolling away with it. */}
      <DialogContent className="w-[80vw] sm:max-w-[80vw] h-[90vh] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {isLoading || !product ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading product...
          </div>
        ) : (
          <>
            <DialogHeader className="px-6 pt-6 shrink-0">
              <DialogTitle>Edit product</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <AddProductForm
                storeId={storeId}
                storeURL={storeURL}
                categories={categories}
                product={mapProductForEdit(product)}
                onSuccess={() => onOpenChange(false)}
                onCancel={() => onOpenChange(false)}
                variant="modal"
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}