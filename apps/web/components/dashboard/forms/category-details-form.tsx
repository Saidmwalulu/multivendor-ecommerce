"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";


import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/loading-button";

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";

import { createCategorySchema } from "@repo/shared";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "../shared/image-upload";
import { createCategory, getCategoryById, updateCategory } from "@/lib/category";

type CategoryValues = z.infer<typeof createCategorySchema>;

interface CategoryFormProps {
  categoryId?: string;
  /** Render without the outer Card (e.g. when already inside a Dialog). Defaults to true. */
  showCard?: boolean;
  /** Called after a successful create/update. When provided, the form skips the page
   * redirect and lets the caller decide what happens next (e.g. close a dialog). */
  onSuccess?: () => void;
}

export default function CategoryDetailsForm({
  categoryId,
  showCard = true,
  onSuccess,
}: CategoryFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<CategoryValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      image: "",
      url: "",
      featured: false,
    },
  });

  // Existing category, when editing
  const { data: existingCategory } = useQuery({
    queryKey: ["categories", categoryId],
    queryFn: () => getCategoryById(categoryId as string),
    enabled: !!categoryId,
  });

  useEffect(() => {
    if (!existingCategory) return;

    form.reset({
      name: existingCategory.name,
      image: existingCategory.image,
      url: existingCategory.url,
      featured: existingCategory.featured,
    });
  }, [existingCategory, form]);

  const mutation = useMutation({
    mutationFn: (values: CategoryValues) =>
      categoryId
        ? updateCategory(categoryId, values)
        : createCategory(values),
    onSuccess: () => {
      toast.success(
        categoryId ? "Category updated successfully" : "Category created successfully"
      );

      queryClient.invalidateQueries({ queryKey: ["categories"] });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard/admin/categories");
        router.refresh();
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Something went wrong");
    },
  });

  function onSubmit(values: CategoryValues) {
    mutation.mutate(values);
  }

  const formContent = (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6"
    >
      <FieldGroup>

        <Controller
          control={form.control}
          name="image"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Category Image</FieldLabel>

                <div className="flex justify-center">
                    <div className="w-fit">
                        <ImageUpload
                          value={field.value ? [field.value] : []}
                          disabled={mutation.isPending}
                          onChange={(url) => field.onChange(url)}
                          onRemove={() => field.onChange("")}
                        />
                    </div>
                </div>

              {fieldState.invalid && (
                <FieldError
                  errors={[fieldState.error]}
                />
              )}
            </Field>
          )}
        />
        <div className="flex gap-4">
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>
                Category Name
              </FieldLabel>

              <Input
                placeholder="category name"
                {...field}
              />

              {fieldState.invalid && (
                <FieldError
                  errors={[fieldState.error]}
                />
              )}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="url"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>
                Category URL
              </FieldLabel>

              <Input
                placeholder="category url"
                {...field}
              />

              <FieldDescription>
                Used for SEO friendly URLs.
              </FieldDescription>

              {fieldState.invalid && (
                <FieldError
                  errors={[fieldState.error]}
                />
              )}
            </Field>
          )}
        />
        </div>
        <Controller
          control={form.control}
          name="featured"
          render={({ field }) => (
            <Field orientation="horizontal">
                <div className="flex items-center w-full justify-between rounded-lg border border-border/60 bg-muted/20 p-4">
                    <div className="space-y-0.5">
                    <FieldLabel htmlFor="featured" className="text-sm">
                        Featured
                    </FieldLabel>

                    <FieldDescription>
                        Highlight this category across the site.
                    </FieldDescription>
                    </div>

                    <Switch
                    id="featured"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    />
                </div>
            </Field>
          )}
        />

        <LoadingButton
          type="submit"
          loading={mutation.isPending}
        >
          {categoryId
            ? "Update Category"
            : "Create Category"}
        </LoadingButton>

      </FieldGroup>
    </form>
  );

  if (!showCard) {
    return formContent;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {categoryId
            ? "Edit Category"
            : "Create Category Information"}
        </CardTitle>

      </CardHeader>

      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}