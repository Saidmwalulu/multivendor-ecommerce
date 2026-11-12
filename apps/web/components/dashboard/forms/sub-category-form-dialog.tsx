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

import SubCategoryDetailsForm from "./sub-category-details-form";

interface SubCategoryFormDialogProps {
  categoryId?: string;
  trigger?: React.ReactNode;
  /** Pass these two together to drive the dialog externally (e.g. from a table row's
   * Edit action) instead of rendering a trigger button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SubCategoryFormDialog({
  categoryId,
  trigger,
  open: openProp,
  onOpenChange,
}: SubCategoryFormDialogProps) {
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
              Create Sub-Category
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[95vh] sm:max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {categoryId ? "Edit Sub-Category" : "Create Sub-Category"}
          </DialogTitle>
          <DialogDescription>
            {categoryId
              ? "Update the details for this sub-category."
              : "Add a new sub-category for your store."}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <SubCategoryDetailsForm
          key={categoryId}
            categoryId={categoryId}
            showCard={false}
            onSuccess={handleSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
