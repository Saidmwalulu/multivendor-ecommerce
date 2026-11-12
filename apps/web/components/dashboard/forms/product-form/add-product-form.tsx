"use client";

import * as React from "react";
import Image from "next/image";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, CircleUserRound, GripVertical, HelpCircle, ImagePlus, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

import { ProductFormSchema, WEIGHT_UNITS, CreateProductDto, ProductFormInput, ProductFormOutput } from "@repo/shared";
import { JoditEditorWrapper } from "./RichTextEditor";
import { VariantsSection } from "./variants-section";
import { CheckboxRow, MoneyInput, numberInputValue, toOptionalNumber } from "./primitives";
import { useRouter } from "next/navigation";
import { useCreateProduct, useUpdateProduct } from "@/lib/hooks/product-mutations";
import { toast } from "sonner";
import { useSubCategories } from "@/lib/hooks/sub-categories";

export type CategoryOption = { id: string; name: string };

// The shape a fetched product comes back in — id plus everything
// CreateProductDto needs, so it can seed the form for editing.
export type ExistingProduct = CreateProductDto & { id: string };

interface AddProductFormProps {
  storeId: string;
  storeURL: string;
  categories: CategoryOption[];
  product?: ExistingProduct;
  onSuccess?: () => void;
   onCancel?: () => void;
  // "page": full-page route inside the dashboard sidebar layout — bottom bar
  // is fixed to the viewport and offset by the sidebar width.
  // "modal": rendered inside a Dialog/Sheet (e.g. ProductEditSheet) — bottom
  // bar is sticky within the modal's own scroll container, full width, no
  // sidebar offset.
  variant?: "page" | "modal";
}

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // matches the backend's decodeImageDataUri limit

const DEFAULT_VALUES: ProductFormInput = {
  name: "",
  description: "",
  images: [],
  categoryId: "",
  subCategoryId: "",
  price: NaN,
  compareAtPrice: undefined,
  chargeTax: true,
  isOnSale: false,
  saleEndDate: undefined,
  costPerItem: undefined,
  sku: "",
  barcode: "",
  trackQuantity: true,
  quantity: 0,
  continueSellingWhenOutOfStock: false,
  isPhysicalProduct: true,
  weight: undefined,
  weightUnit: "kg",
  keywords: [],
  questions: [],
  options: [],
  variants: [],
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4 border-b border-border pb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

// Converts a number-input's raw string into what z.number() expects.
// An empty required field becomes NaN rather than 0, so "required"
// validation still fires instead of silently passing as a valid zero.
function toNumber(raw: string): number {
  return raw === "" ? NaN : Number(raw);
}

// Converts a File into the base64 data URI the backend expects
// (data:image/...;base64,...) — see decodeImageDataUri on the server.
// Replaces URL.createObjectURL, which only produces a browser-local
// "blob:" reference that dies with the tab and was never actually
// uploaded anywhere.
function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Backend validation errors arrive as { field: "sku", message: "..." }[]
// (see ZodValidationPipe). "field" can be a dotted/indexed path like
// "variants.0.sku" — RHF's setError accepts that path directly.
function applyServerErrors(
  errors: { field: string; message: string }[] | undefined,
  setError: (name: any, error: { type: string; message: string }) => void,
) {
  if (!errors?.length) return false;
  errors.forEach(({ field, message }) => {
    setError(field, { type: "server", message });
  });
  return true;
}

export function AddProductForm({
  storeId,
  storeURL,
  categories,
  product,
  onSuccess,
  onCancel,
  variant = "page",
}: AddProductFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(product?.id);
  const isModal = variant === "modal";

  const form = useForm<ProductFormInput, any, ProductFormOutput>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: product ?? DEFAULT_VALUES,
    mode: "onBlur",
  });

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting },
  } = form;

  const createMutation = useCreateProduct(storeId);
  const updateMutation = useUpdateProduct(storeId, product?.id ?? "");
  const mutation = isEditMode ? updateMutation : createMutation;

  const imagesArray = useFieldArray({ control, name: "images" });
  const questionsArray = useFieldArray({ control, name: "questions" });

  const price = useWatch({ control, name: "price" });
  const costPerItem = useWatch({ control, name: "costPerItem" });
  const trackQuantity = useWatch({ control, name: "trackQuantity" });
  const isPhysicalProduct = useWatch({ control, name: "isPhysicalProduct" });
  const isOnSale = useWatch({ control, name: "isOnSale" });
  const variants = useWatch({ control, name: "variants" });
  const categoryId = useWatch({ control, name: "categoryId" });
  const { data: subCategories = [], isLoading: subCategoriesLoading } = useSubCategories(categoryId);
  const hasVariants = (variants?.length ?? 0) > 0;

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [keywordDraft, setKeywordDraft] = React.useState("");
  const [isUploadingImages, setIsUploadingImages] = React.useState(false);

  // Index of the tile currently being dragged, and the one it's hovering
  // over. Both are UI-only state - the actual order lives in the field array.
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_IMAGES - imagesArray.fields.length;
    const selected = Array.from(files).slice(0, remainingSlots);
    e.target.value = ""; // reset now so selecting the same file again still fires onChange

    // The input's `accept` attribute is a UI hint only, not a real
    // guarantee — reject anything that isn't actually an image.
    const invalidType = selected.find((f) => !f.type.startsWith("image/"));
    if (invalidType) {
      toast.error(`${invalidType.name} isn't a supported image type.`);
      return;
    }

    // Matches the backend's 5MB limit — catch it here instead of making
    // the seller wait for a round trip just to find out.
    const tooLarge = selected.find((f) => f.size > MAX_IMAGE_BYTES);
    if (tooLarge) {
      toast.error(`${tooLarge.name} is over 5MB.`);
      return;
    }

    setIsUploadingImages(true);
    try {
      const dataUris = await Promise.all(selected.map(fileToDataUri));
      dataUris.forEach((url) => imagesArray.append({ url }));
    } catch {
      toast.error("Failed to read one or more images. Please try again.");
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex !== null && dragIndex !== targetIndex) {
      imagesArray.move(dragIndex, targetIndex);
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  // Profit and margin are derived, never stored - Shopify shows them purely
  // as feedback while you type a cost.
  const hasCost = typeof costPerItem === "number" && !Number.isNaN(costPerItem);
  const hasPrice = typeof price === "number" && !Number.isNaN(price) && price > 0;
  const profit = hasCost && hasPrice ? price - costPerItem : null;
  const margin = profit !== null && hasPrice ? (profit / price) * 100 : null;

  const onSubmit = async (values: ProductFormOutput) => {
    // The option editor keeps a trailing blank input around for typing into -
    // drop those before the payload leaves the form.
    const payload: CreateProductDto = {
      ...values,
      options: values.options.map((option) => ({
        ...option,
        name: option.name.trim(),
        values: option.values
          .map((v) => ({ ...v, value: v.value.trim() }))
          .filter((v) => v.value),
      })),
      // A blank variant name means "use the option values", so resolve it
      // here rather than making every consumer handle the fallback.
      variants: values.variants.map((variant) => ({
        ...variant,
        name: variant.name?.trim() || variant.optionValues.join(" / "),
      })),
    };

    try {
      await mutation.mutateAsync(payload);
      toast.success(isEditMode ? "Product updated" : "Product created as draft");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/dashboard/seller/stores/${storeURL}/products`);
      }
    } catch (error: any) {
      // Matches the { success: false, message, errors: [...] } shape from
      // HttpExceptionFilter. Field-level errors (e.g. duplicate SKU) get
      // attached to the exact input; anything else falls back to a toast.
      const serverErrors = error?.response?.data?.errors as
        | { field: string; message: string }[]
        | undefined;
      const handled = applyServerErrors(serverErrors, setError);
      if (!handled) {
        const message = error?.response?.data?.message ?? "Something went wrong. Please try again.";
        toast.error(message);
      }
    }
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden text-foreground">
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-background">
        <main className={["flex-1 overflow-y-auto relative min-h-0", isModal ? "p-6" : "p-6 lg:p-8"].join(" ")}>
          <form
            id="add-product-form"
            onSubmit={handleSubmit(onSubmit)}
            className={["max-w-[1440px] mx-auto", isModal ? "pb-6" : "pb-28"].join(" ")}
          >
            <div className="mb-4">
              <p className="text-muted-foreground ">
                {isEditMode
                  ? "Update this listing in the global catalog."
                  : "Create a new listing in the global catalog."}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left column - the main product record */}
              <div className="lg:col-span-8 space-y-6">
                <Section title="Basic Information">
                  <FieldGroup>
                    <Controller
                      name="name"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            Product Name *
                          </FieldLabel>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            id={field.name}
                            placeholder="e.g. Premium Cotton T-Shirt"
                            aria-invalid={fieldState.invalid}
                          />
                          <FieldDescription>
                            Letters, numbers, spaces, hyphens and underscores
                            only - 2 to 200 characters.
                          </FieldDescription>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name="description"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            Product Description
                          </FieldLabel>
                          <JoditEditorWrapper
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder="Detailed product description..."
                          />
                          <FieldDescription>
                            Optional. You can add this later before publishing.
                          </FieldDescription>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </Section>

                {/* ---------------------------------------------------------
                    Media - first tile is the main image, tiles reorder by drag
                --------------------------------------------------------- */}
                <Section title="Media">
                  <Controller
                    name="images"
                    control={control}
                    render={({ fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldDescription>
                          Upload up to 6 high-quality images. The large tile is
                          the main image - drag any image onto it to promote it.
                        </FieldDescription>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleFilesSelected}
                        />

                        {imagesArray.fields.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingImages}
                            className="w-full py-14 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-muted hover:border-primary cursor-pointer transition-all bg-background disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <ImagePlus className="h-8 w-8 mb-2" />
                            <span className="text-sm font-medium">
                              {isUploadingImages ? "Processing..." : "Add images"}
                            </span>
                            <span className="text-xs mt-0.5">
                              The first image you upload becomes the main image
                            </span>
                          </button>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {imagesArray.fields.map((item, index) => {
                              const isMain = index === 0;
                              const isDropTarget =
                                dropIndex === index && dragIndex !== index;

                              return (
                                <div
                                  key={item.id}
                                  draggable
                                  onDragStart={() => setDragIndex(index)}
                                  onDragEnter={() => setDropIndex(index)}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={() => handleDrop(index)}
                                  onDragEnd={() => {
                                    setDragIndex(null);
                                    setDropIndex(null);
                                  }}
                                  className={[
                                    "aspect-square rounded-lg border relative group overflow-hidden bg-muted cursor-grab active:cursor-grabbing transition-all",
                                    isMain
                                      ? "col-span-2 row-span-2 border-primary/60"
                                      : "border-border",
                                    isDropTarget
                                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                      : "",
                                    dragIndex === index ? "opacity-40" : "",
                                  ].join(" ")}
                                >
                                  <Image
                                    className="object-cover pointer-events-none"
                                    src={item.url}
                                    alt={
                                      isMain
                                        ? "Main product image"
                                        : `Product image ${index + 1}`
                                    }
                                    fill
                                    sizes={
                                      isMain
                                        ? "(max-width: 640px) 100vw, 50vw"
                                        : "(max-width: 640px) 50vw, 25vw"
                                    }
                                    draggable={false}
                                    unoptimized
                                  />

                                  {isMain && (
                                    <Badge className="absolute top-2 left-2 z-10">
                                      Main image
                                    </Badge>
                                  )}

                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="absolute top-2 right-2 text-white/80">
                                      <GripVertical className="h-5 w-5" />
                                    </span>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="destructive"
                                      className="absolute bottom-2 right-2 rounded-full h-8 w-8"
                                      onClick={() => imagesArray.remove(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}

                            {imagesArray.fields.length < MAX_IMAGES && (
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingImages}
                                className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-muted hover:border-primary cursor-pointer transition-all bg-background disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <ImagePlus className="h-7 w-7 mb-1" />
                                <span className="text-xs">
                                  {isUploadingImages ? "Processing..." : "Add Image"}
                                </span>
                              </button>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-2">
                          {imagesArray.fields.length} of {MAX_IMAGES} images
                          used.
                        </p>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                </Section>

                {/* ---------------------------------------------------------
                    Pricing
                --------------------------------------------------------- */}
                <Section title="Pricing">
                  <FieldGroup>
                    {hasVariants && (
                      <p className="text-xs text-muted-foreground rounded-md bg-muted px-3 py-2">
                        This product has variants - each variant sets its own
                        price below. The price here is used as the starting
                        value for new variants.
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Controller
                        name="price"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name}>Price *</FieldLabel>
                            <MoneyInput
                              id={field.name}
                              name={field.name}
                              inputRef={field.ref}
                              value={field.value ?? undefined}
                              onChange={(raw) => field.onChange(toNumber(raw))}
                              onBlur={field.onBlur}
                            />
                            {fieldState.invalid && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </Field>
                        )}
                      />

                      <Controller
                        name="compareAtPrice"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name}>
                              Compare-at price
                            </FieldLabel>
                            <MoneyInput
                              id={field.name}
                              name={field.name}
                              inputRef={field.ref}
                              value={field.value ?? undefined}
                              onChange={(raw) =>
                                field.onChange(toOptionalNumber(raw))
                              }
                              onBlur={field.onBlur}
                            />
                            <FieldDescription>
                              The original price, shown struck through.
                            </FieldDescription>
                            {fieldState.invalid && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </Field>
                        )}
                      />
                    </div>

                    <Controller
                      name="chargeTax"
                      control={control}
                      render={({ field }) => (
                        <CheckboxRow
                          id={field.name}
                          label="Charge tax on this product"
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />

                    <Controller
                      name="isOnSale"
                      control={control}
                      render={({ field }) => (
                        <CheckboxRow
                          id={field.name}
                          label="Mark as on sale"
                          description="Shows the compare-at price struck through on the storefront."
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />

                    {isOnSale && (
                      <Controller
                        name="saleEndDate"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field
                            data-invalid={fieldState.invalid}
                            className="max-w-xs pl-6"
                          >
                            <FieldLabel htmlFor={field.name}>
                              Sale end date
                            </FieldLabel>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              id={field.name}
                              type="date"
                            />
                            <FieldDescription>
                              Optional. Leave blank to run indefinitely.
                            </FieldDescription>
                            {fieldState.invalid && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </Field>
                        )}
                      />
                    )}

                    <div className="border-t border-border pt-5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Controller
                          name="costPerItem"
                          control={control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel htmlFor={field.name}>
                                Cost per item
                              </FieldLabel>
                              <MoneyInput
                                id={field.name}
                                name={field.name}
                                inputRef={field.ref}
                                value={field.value ?? undefined}
                                onChange={(raw) =>
                                  field.onChange(toOptionalNumber(raw))
                                }
                                onBlur={field.onBlur}
                              />
                              <FieldDescription>
                                Not shown to customers.
                              </FieldDescription>
                              {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                              )}
                            </Field>
                          )}
                        />

                        <Field>
                          <FieldLabel>Profit</FieldLabel>
                          <div className="h-9 flex items-center px-3 rounded-md border border-border bg-muted text-sm text-muted-foreground">
                            {profit !== null ? `$${profit.toFixed(2)}` : "--"}
                          </div>
                        </Field>

                        <Field>
                          <FieldLabel>Margin</FieldLabel>
                          <div className="h-9 flex items-center px-3 rounded-md border border-border bg-muted text-sm text-muted-foreground">
                            {margin !== null ? `${margin.toFixed(1)}%` : "--"}
                          </div>
                        </Field>
                      </div>
                    </div>
                  </FieldGroup>
                </Section>

                {/* ---------------------------------------------------------
                    Inventory
                --------------------------------------------------------- */}
                <Section title="Inventory">
                  <FieldGroup>
                    {hasVariants && (
                      <p className="text-xs text-muted-foreground rounded-md bg-muted px-3 py-2">
                        Stock is tracked per variant below. The SKU here
                        identifies the product as a whole.
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Controller
                        name="sku"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name}>
                              SKU (Stock Keeping Unit)
                            </FieldLabel>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              id={field.name}
                              placeholder="e.g. TSHIRT-WHT-M"
                            />
                            <FieldDescription>
                              Optional — one is generated automatically if left
                              blank. Up to 50 characters, unique to this store.
                            </FieldDescription>
                            {fieldState.invalid && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </Field>
                        )}
                      />

                      <Controller
                        name="barcode"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name}>
                              Barcode (ISBN, UPC, GTIN)
                            </FieldLabel>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              id={field.name}
                              placeholder="e.g. 0123456789012"
                            />
                            {fieldState.invalid && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </Field>
                        )}
                      />
                    </div>

                    <Controller
                      name="trackQuantity"
                      control={control}
                      render={({ field }) => (
                        <CheckboxRow
                          id={field.name}
                          label="Track quantity"
                          description="Stock levels are decremented automatically as orders come in."
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />

                    {trackQuantity && !hasVariants && (
                      <div className="pl-6 space-y-4">
                        <Controller
                          name="quantity"
                          control={control}
                          render={({ field, fieldState }) => (
                            <Field
                              data-invalid={fieldState.invalid}
                              className="max-w-xs"
                            >
                              <FieldLabel htmlFor={field.name}>
                                Available quantity
                              </FieldLabel>
                              <Input
                                id={field.name}
                                name={field.name}
                                ref={field.ref}
                                type="number"
                                min="0"
                                step="1"
                                value={numberInputValue(field.value)}
                                onChange={(e) =>
                                  field.onChange(toNumber(e.target.value))
                                }
                                onBlur={field.onBlur}
                              />
                              {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                              )}
                            </Field>
                          )}
                        />

                        <Controller
                          name="continueSellingWhenOutOfStock"
                          control={control}
                          render={({ field }) => (
                            <CheckboxRow
                              id={field.name}
                              label="Continue selling when out of stock"
                              description="Allows the product to be oversold and backordered."
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      </div>
                    )}
                  </FieldGroup>
                </Section>

                {/* ---------------------------------------------------------
                    Shipping
                --------------------------------------------------------- */}
                <Section title="Shipping">
                  <FieldGroup>
                    <Controller
                      name="isPhysicalProduct"
                      control={control}
                      render={({ field }) => (
                        <CheckboxRow
                          id={field.name}
                          label="This is a physical product"
                          description="Uncheck for digital goods and services - they skip shipping entirely."
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />

                    {isPhysicalProduct && (
                      <div className="pl-6">
                        <Field className="max-w-xs">
                          <FieldLabel htmlFor="weight">Weight</FieldLabel>
                          <div className="flex gap-2">
                            <Controller
                              name="weight"
                              control={control}
                              render={({ field, fieldState }) => (
                                <div className="flex-1">
                                  <Input
                                    id="weight"
                                    name={field.name}
                                    ref={field.ref}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    aria-invalid={fieldState.invalid}
                                    value={numberInputValue(field.value)}
                                    onChange={(e) =>
                                      field.onChange(
                                        toOptionalNumber(e.target.value),
                                      )
                                    }
                                    onBlur={field.onBlur}
                                  />
                                  {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                  )}
                                </div>
                              )}
                            />

                            <Controller
                              name="weightUnit"
                              control={control}
                              render={({ field }) => (
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {WEIGHT_UNITS.map((unit) => (
                                      <SelectItem key={unit} value={unit}>
                                        {unit}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <FieldDescription>
                            Optional. Used to calculate shipping rates at checkout.
                          </FieldDescription>
                        </Field>
                      </div>
                    )}
                  </FieldGroup>
                </Section>

                {/* ---------------------------------------------------------
                    Variants
                --------------------------------------------------------- */}
                <Section
                  title="Variants"
                  description="Options like size or colour. Each variant carries its own price, stock and SKU."
                >
                  <VariantsSection
                    form={form}
                    images={imagesArray.fields}
                  />
                </Section>
              </div>

              {/* Right column - organisation and discoverability */}
              <div className="lg:col-span-4 space-y-6">
                <Section title="Organization">
                  <FieldGroup>
                    <Controller
                      name="categoryId"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            Category *
                          </FieldLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Only clear the sub-category if the category actually changed —
                              // guards against clearing it on initial mount when editing an
                              // existing product (where categoryId is already set).
                              if (value !== field.value) {
                                form.setValue("subCategoryId", "", { shouldValidate: false });
                              }
                            }}
                          >
                            <SelectTrigger id={field.name}>
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name="subCategoryId"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            Sub-category *
                          </FieldLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!categoryId || subCategoriesLoading}
                          >
                            <SelectTrigger id={field.name}>
                              <SelectValue
                                placeholder={
                                  !categoryId
                                    ? "Select a category first"
                                    : subCategoriesLoading
                                      ? "Loading sub-categories..."
                                      : "Select Sub-category"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {subCategories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!categoryId ? (
                            <FieldDescription>Choose a category to see its sub-categories.</FieldDescription>
                          ) : !subCategoriesLoading && subCategories.length === 0 ? (
                            <FieldDescription>No sub-categories exist under this category yet.</FieldDescription>
                          ) : null}
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </Section>

                <Section title="Keywords">
                  <Controller
                    name="keywords"
                    control={control}
                    render={({ field, fieldState }) => {
                      const keywords = field.value ?? [];
                      return (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldDescription>
                            Optional. Add up to 10 keywords for search optimization.
                          </FieldDescription>
                          <Input
                            value={keywordDraft}
                            onChange={(e) => setKeywordDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              const value = keywordDraft.trim();
                              if (
                                !value ||
                                keywords.includes(value) ||
                                keywords.length >= 10
                              ) {
                                return;
                              }
                              field.onChange([...keywords, value]);
                              setKeywordDraft("");
                            }}
                            placeholder="Add keyword and press enter..."
                          />
                          <FieldContent>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {keywords.map((keyword) => (
                                <div
                                  key={keyword}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-full"
                                >
                                  <span className="text-sm">{keyword}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      field.onChange(
                                        keywords.filter((k) => k !== keyword),
                                      )
                                    }
                                    className="text-muted-foreground hover:text-destructive"
                                    aria-label={`Remove ${keyword}`}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {keywords.length} of 10 keywords used.
                            </p>
                          </FieldContent>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      );
                    }}
                  />
                </Section>
              </div>
            </div>

            {/* Supplementary content - collected last, doesn't block a listing from going live */}
            <div className="mt-10">
              <Section title="Additional Information">
                <p className="text-muted-foreground mb-4">
                  Optional. Answer common buyer questions up front to reduce
                  pre-sale support requests.
                </p>
                <div className="space-y-4 mb-4">
                  {questionsArray.fields.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-4 border border-border rounded-lg bg-background relative"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => questionsArray.remove(index)}
                        className="absolute top-3 right-3 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <FieldGroup className="pr-10 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                        <Controller
                          name={`questions.${index}.question`}
                          control={control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel htmlFor={field.name}>
                                Question
                              </FieldLabel>
                              <Input
                                {...field}
                                id={field.name}
                                placeholder="e.g. Is this machine washable?"
                              />
                              {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                              )}
                            </Field>
                          )}
                        />
                        <Controller
                          name={`questions.${index}.answer`}
                          control={control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel htmlFor={field.name}>
                                Answer
                              </FieldLabel>
                              <Textarea
                                {...field}
                                id={field.name}
                                rows={2}
                                placeholder="Enter the answer here..."
                              />
                              {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                              )}
                            </Field>
                          )}
                        />
                      </FieldGroup>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    questionsArray.append({ question: "", answer: "" })
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add Question
                </Button>
              </Section>
            </div>
          </form>
        </main>

        <div className="w-full sticky bottom-0 bg-card border-t border-border p-4 flex justify-end gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-30 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (isModal && onCancel) {
                onCancel();
              } else {
                reset(product ?? DEFAULT_VALUES);
              }
            }}
          >
            {isModal && onCancel ? "Cancel" : "Discard"}
          </Button>
          <Button
            type="submit"
            form="add-product-form"
            disabled={isSubmitting || mutation.isPending}
          >
            {mutation.isPending
              ? "Saving..."
              : isEditMode
                ? "Update Product"
                : "Save Product"}
          </Button>
        </div>
      </div>
    </div>
  );
}