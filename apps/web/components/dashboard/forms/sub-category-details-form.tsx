"use client";

import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
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

import { createSubCategorySchema } from "@repo/shared";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "../shared/image-upload";
import { getSubCategories, getSubCategoryById } from "@/lib/sub-category";
import { getCategories } from "@/lib/category";
import { SelectableInput } from "@/components/selectable-input";

type SubCategoryValues = z.infer<typeof createSubCategorySchema>;

interface SubCategoryFormProps {
  categoryId?: string;
  /** Render without the outer Card (e.g. when already inside a Dialog). Defaults to true. */
  showCard?: boolean;
  /** Called after a successful create/update. When provided, the form skips the page
   * redirect and lets the caller decide what happens next (e.g. close a dialog). */
  onSuccess?: () => void;
}

export default function SubCategoryDetailsForm({
  categoryId,
  showCard = true,
  onSuccess,
}: SubCategoryFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Parent category options for the select
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000, // 5 min — category list rarely changes
  });

  // Existing category, when editing
  const { data: existingSubCategory, isLoading: isLoadingExisting } = useQuery({
    queryKey: ["subCategories", categoryId],
    queryFn: () => getSubCategoryById(categoryId as string),
    enabled: !!categoryId,
  });

  const form = useForm<SubCategoryValues>({
    resolver: zodResolver(createSubCategorySchema),
    defaultValues: {
      name: "",
      image: "",
      url: "",
      categoryId: "",
      featured: false,
    },
    values: existingSubCategory
    ? {
        name: existingSubCategory.name,
        image: existingSubCategory.image,
        url: existingSubCategory.url,
        categoryId: existingSubCategory.categoryId ?? "",
        featured: existingSubCategory.featured,
      }
    : undefined,
  });

  const mutation = useMutation({
    mutationFn: async (values: SubCategoryValues) => {
      if (categoryId) {
        return api.patch(`/sub-categories/${categoryId}`, values);
      }
      return api.post("/sub-categories", values);
    },
    onSuccess: () => {
      toast.success(
        categoryId ? "sub-category updated successfully" : "sub-category created successfully"
      );

      queryClient.invalidateQueries({ queryKey: ["subCategories"] });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard/admin/sub-categories");
        router.refresh();
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Something went wrong");
    },
  });

  function onSubmit(values: SubCategoryValues) {
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
              <FieldLabel>Sub Category Image</FieldLabel>

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
                Sub Category Name
              </FieldLabel>

              <Input
                placeholder="sub-category name"
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
                Sub Category URL
              </FieldLabel>

              <Input
                placeholder="sub-category url"
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
          name="categoryId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>
                Parent Category
              </FieldLabel>

              <SelectableInput
                items={categories.map((category: { id: string; name: string }) => ({
                  value: category.id,
                  label: category.name,
                }))}
                defaultValue={field.value}
                onValueChange={field.onChange}
                disabled={categoriesLoading}
                placeholder={
                  categoriesLoading ? "Loading categories..." : "Select a category"
                }
              />

              <FieldDescription>
                Choose the category this subcategory belongs to.
              </FieldDescription>

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
            ? "Update Sub Category"
            : "Create Sub Category"}
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
            ? "Edit Sub Category"
            : "Create Sub Category Information"}
        </CardTitle>

      </CardHeader>

      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}
