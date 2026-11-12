"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import CategoryDetailsForm from "./category-details-form";

interface CategoryFormDialogProps {
  categoryId?: string;
  trigger?: React.ReactNode;
  /** Pass these two together to drive the dialog externally (e.g. from a table row's
   * Edit action) instead of rendering a trigger button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CategoryFormDialog({
  categoryId,
  trigger,
  open: openProp,
  onOpenChange,
}: CategoryFormDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Category
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[95vh] sm:max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {categoryId ? "Edit Category" : "Create Category"}
          </DialogTitle>
          <DialogDescription>
            {categoryId
              ? "Update the details for this category."
              : "Add a new category for your store."}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <CategoryDetailsForm
            categoryId={categoryId}
            showCard={false}
            onSuccess={handleSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
