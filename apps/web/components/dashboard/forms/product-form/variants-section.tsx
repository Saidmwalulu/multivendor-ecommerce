"use client";

import * as React from "react";
import Image from "next/image";
import { Controller, useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { ChevronRight, ImagePlus, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { HexColorPicker } from "react-colorful";
import { CheckboxRow, MoneyInput } from "./primitives";

import {
  MAX_OPTIONS,
  ProductFormInput,
  ProductFormOutput,
  SUGGESTED_OPTION_NAMES,
  type CreateProductDto,
} from "@repo/shared";

type ProductOption = NonNullable<ProductFormInput["options"]>[number];
type ProductOptionValue = ProductOption["values"][number];
type ProductVariant = NonNullable<ProductFormInput["variants"]>[number];

interface VariantsSectionProps {
  form: UseFormReturn<ProductFormInput, any, ProductFormOutput>;
  images: { url: string }[];
}

// Lets the browser's own CSS parser decide - covers hex, named colours
// ("red", "cornflowerblue"), rgb(), hsl(), etc.
function isValidCssColor(value: string): boolean {
  if (!value.trim()) return false;
  const probe = new Option().style;
  probe.color = value;
  return probe.color !== "";
}

// Normalizes any valid CSS colour to hex, for the picker which only
// understands hex.
function cssColorToHex(value: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = value;
  const normalized = ctx.fillStyle;
  return normalized.length === 9 ? normalized.slice(0, 7) : normalized;
}

// Swatches only make sense on a colour option, so the picker appears based
// on what the seller named the option.
function isColorOption(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return normalized === "color" || normalized === "colour";
}

function ColorSwatch({
  color,
  className = "h-4 w-4",
}: {
  color?: string;
  className?: string;
}) {
  if (!color || !isValidCssColor(color)) return null;
  return (
    <span
      className={`${className} shrink-0 rounded-full border border-border`}
      style={{ backgroundColor: color }}
    />
  );
}

// Identifies a variant by its combination of option values, so edits survive
// when an unrelated option value is added or removed.
function variantKey(optionValues: string[]): string {
  return optionValues.join(" / ");
}

// Cartesian product of every option's non-blank values.
// [["S","M"], ["Red","Blue"]] -> [["S","Red"], ["S","Blue"], ["M","Red"], ...]
function buildCombinations(options: ProductOption[]): string[][] {
  const valueLists = options
    .map((option) =>
      option.values.map((v) => v.value.trim()).filter(Boolean),
    )
    .filter((values) => values.length > 0);

  if (valueLists.length === 0) return [];

  return valueLists.reduce<string[][]>(
    (combinations, values) =>
      combinations.flatMap((combination) =>
        values.map((value) => [...combination, value]),
      ),
    [[]],
  );
}

function emptyOption(): ProductOption {
  // The trailing blank is the "next value" input, the way Shopify's editor
  // always leaves you one empty row to type into.
  return { name: "", values: [{ value: "" }] };
}

export function VariantsSection({
  form,
  images,
}: VariantsSectionProps) {
  const { control, getValues, setValue } = form;

  const variantsArray = useFieldArray({ control, name: "variants" });

  // Only used for the running stock total in the header.
  const watchedVariants = useWatch({ control, name: "variants" }) ?? [];

  // Only one variant's details are open at a time, to keep the table readable.
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);

  // A deleted combination should stay deleted even though the option editor
  // regenerates the table on every change - so removals are tracked
  // separately, with the deleted row's own data, and filtered out of every
  // rebuild. Adding a *new* option value still produces a fresh row for it,
  // same as Shopify.
  const [removed, setRemoved] = React.useState<Map<string, ProductVariant>>(
    () => new Map(),
  );

  // Options are replaced wholesale on every edit rather than managed with a
  // nested field array - each change has to regenerate the variant table
  // anyway, so one code path keeps the two in step.
  const [options, setOptions] = React.useState<ProductOption[]>(
    () => getValues("options") ?? [],
  );

  const commit = (nextOptions: ProductOption[]) => {
    setOptions(nextOptions);
    setValue("options", nextOptions, { shouldDirty: true });

    const combinations = buildCombinations(nextOptions).filter(
      (optionValues) => !removed.has(variantKey(optionValues)),
    );
    const existing = new Map(
      (getValues("variants") ?? []).map((variant) => [
        variantKey(variant.optionValues),
        variant,
      ]),
    );
    const fallbackPrice = getValues("price");
    const fallbackCompareAtPrice = getValues("compareAtPrice");
    const fallbackIsOnSale = getValues("isOnSale");
    const fallbackSaleEndDate = getValues("saleEndDate");

    variantsArray.replace(
      combinations.map<ProductVariant>((optionValues) => {
        const previous = existing.get(variantKey(optionValues));
        if (previous) return previous;

        return {
          optionValues,
          price: fallbackPrice,
          compareAtPrice: fallbackCompareAtPrice,
          isOnSale: fallbackIsOnSale,
          saleEndDate: fallbackSaleEndDate,
          quantity: 0,
          sku: "",
        };
      }),
    );
  };

  const deleteVariant = (index: number) => {
    const item = variantsArray.fields[index];
     if (!item) return;
    setRemoved((prev) =>
      new Map(prev).set(variantKey(item.optionValues), item),
    );
    variantsArray.remove(index);
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const restoreRemovedVariants = () => {
    const restored = Array.from(removed.values());
    setRemoved(new Map());
    variantsArray.append(restored);
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    commit([...options, emptyOption()]);
  };

  const removeOption = (index: number) => {
    commit(options.filter((_, i) => i !== index));
  };

  const updateOptionName = (index: number, name: string) => {
    commit(options.map((o, i) => (i === index ? { ...o, name } : o)));
  };

  const updateOptionValue = (
    optionIndex: number,
    valueIndex: number,
    value: string,
  ) => {
    const nextOptions = options.map((option, i) => {
      if (i !== optionIndex) return option;

      const values = option.values.map((v, vi) =>
        vi === valueIndex ? { ...v, value } : v,
      );

      // Typing into the last row opens a fresh one below it.
      const isLast = valueIndex === option.values.length - 1;
      if (isLast && value.trim()) values.push({ value: "" });

      return { ...option, values };
    });

    commit(nextOptions);
  };

  const updateOptionSwatch = (
    optionIndex: number,
    valueIndex: number,
    swatch: string,
  ) => {
    const nextOptions = options.map((option, i) =>
      i !== optionIndex
        ? option
        : {
            ...option,
            values: option.values.map((v, vi) =>
              vi === valueIndex ? { ...v, swatch } : v,
            ),
          },
    );

    commit(nextOptions);
  };

  const removeOptionValue = (optionIndex: number, valueIndex: number) => {
    const nextOptions = options.map((option, i) => {
      if (i !== optionIndex) return option;

      const values = option.values.filter((_, vi) => vi !== valueIndex);
      // Never leave the option without an input to type into.
      return {
        ...option,
        values: values.length > 0 ? values : [{ value: "" } as ProductOptionValue],
      };
    });

    commit(nextOptions);
  };

  // Header labels for the variant table come from the options themselves.
  const optionNames = options.map(
    (option, index) => option.name.trim() || `Option ${index + 1}`,
  );

  // Lets the variant table draw a swatch beside a colour value without
  // re-deriving which option that value came from on every cell.
  const swatchByValue = React.useMemo(() => {
    const map = new Map<string, string>();
    options.forEach((option) => {
      if (!isColorOption(option.name)) return;
      option.values.forEach(({ value, swatch }) => {
        if (value.trim() && swatch) map.set(value.trim(), swatch);
      });
    });
    return map;
  }, [options]);

  const totalStock = watchedVariants.reduce(
    (sum, variant) =>
      sum + (Number.isNaN(variant.quantity) ? 0 : variant.quantity),
    0,
  );

  if (options.length === 0) {
    return (
      <div className="border-2 border-dashed border-border rounded-lg py-10 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          No variants yet - this product sells as a single item.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={addOption}
        >
          <Plus className="h-4 w-4" />
          Add options like size or colour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Option editors */}
      <div className="space-y-4">
        {options.map((option, optionIndex) => (
          <div
            key={optionIndex}
            className="border border-border rounded-lg p-4 bg-background relative"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeOption(optionIndex)}
              aria-label={`Remove option ${optionIndex + 1}`}
              className="absolute top-3 right-3 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <div className="pr-10 space-y-4">
              <Controller
                name={`options.${optionIndex}.name`}
                control={control}
                render={({ fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    className="max-w-sm"
                  >
                    <FieldLabel htmlFor={`option-name-${optionIndex}`}>
                      Option name
                    </FieldLabel>
                    <Input
                      id={`option-name-${optionIndex}`}
                      list={`option-name-suggestions-${optionIndex}`}
                      value={option.name}
                      placeholder="e.g. Size"
                      aria-invalid={fieldState.invalid}
                      onChange={(e) =>
                        updateOptionName(optionIndex, e.target.value)
                      }
                    />
                    <datalist id={`option-name-suggestions-${optionIndex}`}>
                      {SUGGESTED_OPTION_NAMES.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name={`options.${optionIndex}.values`}
                control={control}
                render={({ fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Option values</FieldLabel>
                    {isColorOption(option.name) && (
                      <p className="text-xs text-muted-foreground">
                        Pick a swatch colour for each value - the customer sees
                        the name you type, the storefront shows the swatch.
                      </p>
                    )}
                    <div className="space-y-2 max-w-sm">
                      {option.values.map((optionValue, valueIndex) => (
                        <div
                          key={valueIndex}
                          className="flex items-center gap-2"
                        >
                          {isColorOption(option.name) && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={`Pick a swatch for value ${valueIndex + 1}`}
                                  className="h-9 w-9 shrink-0 rounded-md border border-border overflow-hidden"
                                  style={{
                                    backgroundColor:
                                      optionValue.swatch &&
                                      isValidCssColor(optionValue.swatch)
                                        ? optionValue.swatch
                                        : "transparent",
                                  }}
                                />
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-3">
                                <HexColorPicker
                                  color={
                                    optionValue.swatch &&
                                    isValidCssColor(optionValue.swatch)
                                      ? cssColorToHex(optionValue.swatch)
                                      : "#000000"
                                  }
                                  onChange={(color) =>
                                    updateOptionSwatch(
                                      optionIndex,
                                      valueIndex,
                                      color,
                                    )
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                          <Input
                            value={optionValue.value}
                            placeholder={
                              isColorOption(option.name)
                                ? "e.g. Ocean Blue"
                                : "e.g. Medium"
                            }
                            aria-label={`Value ${valueIndex + 1}`}
                            onChange={(e) =>
                              updateOptionValue(
                                optionIndex,
                                valueIndex,
                                e.target.value,
                              )
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              removeOptionValue(optionIndex, valueIndex)
                            }
                            aria-label={`Remove value ${valueIndex + 1}`}
                            className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
          </div>
        ))}
      </div>

      {options.length < MAX_OPTIONS && (
        <Button type="button" variant="outline" onClick={addOption}>
          <Plus className="h-4 w-4" />
          Add another option
        </Button>
      )}

      {/* Generated variant table */}
      {variantsArray.fields.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h4 className="text-sm font-semibold">
              {variantsArray.fields.length} variant
              {variantsArray.fields.length === 1 ? "" : "s"}
            </h4>
            <div className="flex items-center gap-3">
              {removed.size > 0 && (
                <button
                  type="button"
                  onClick={restoreRemovedVariants}
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  Restore {removed.size} removed variant
                  {removed.size === 1 ? "" : "s"}
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                {totalStock} in stock
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-muted border-b border-border text-sm text-muted-foreground">
                  <th className="w-10" />
                  <th className="p-2 font-semibold w-16">Image</th>
                  {optionNames.map((name) => (
                    <th key={name} className="p-2 font-semibold">
                      {name}
                    </th>
                  ))}
                  <th className="p-2 font-semibold w-36">Price ($)</th>
                  <th className="p-2 font-semibold w-28">Available</th>
                  <th className="p-2 font-semibold w-48">SKU</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="bg-background">
                {variantsArray.fields.map((item, index) => (
                  <React.Fragment key={item.id}>
                  <tr className="border-b border-border">
                    <td className="align-top pt-4 pl-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedIndex(
                            expandedIndex === index ? null : index,
                          )
                        }
                        aria-expanded={expandedIndex === index}
                        aria-label={`Toggle details for ${variantKey(item.optionValues)}`}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            expandedIndex === index ? "rotate-90" : ""
                          }`}
                        />
                      </button>
                    </td>

                    <td className="p-2 align-top pt-2.5">
                      <Controller
                        name={`variants.${index}.image`}
                        control={control}
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                aria-label={
                                  field.value?.url
                                    ? "Change variant image"
                                    : "Assign variant image"
                                }
                                className="h-10 w-10 rounded-md border border-dashed border-border overflow-hidden bg-muted flex items-center justify-center text-muted-foreground hover:border-primary transition-colors"
                              >
                                {field.value?.url ? (
                                  <Image
                                    src={field.value.url}
                                    alt=""
                                    width={40}
                                    height={40}
                                    className="h-full w-full object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <ImagePlus className="h-4 w-4" />
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2">
                              {images.length === 0 ? (
                                <p className="text-xs text-muted-foreground p-2">
                                  Upload images in the Media section first.
                                </p>
                              ) : (
                                <>
                                  <p className="text-xs text-muted-foreground px-1 pb-2">
                                    Assign an image from Media
                                  </p>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {images.map((image, imageIndex) => (
                                      <button
                                        key={image.url + imageIndex}
                                        type="button"
                                        onClick={() =>
                                          field.onChange({ url: image.url })
                                        }
                                        className={`aspect-square rounded overflow-hidden border transition-colors ${
                                          field.value?.url === image.url
                                            ? "border-primary ring-1 ring-primary"
                                            : "border-border"
                                        }`}
                                      >
                                        <Image
                                          src={image.url}
                                          alt={`Product image ${imageIndex + 1}`}
                                          width={60}
                                          height={60}
                                          className="h-full w-full object-cover"
                                          unoptimized
                                        />
                                      </button>
                                    ))}
                                  </div>
                                  {field.value?.url && (
                                    <button
                                      type="button"
                                      onClick={() => field.onChange(undefined)}
                                      className="w-full text-xs text-muted-foreground hover:text-destructive mt-2 pt-2 border-t border-border"
                                    >
                                      Remove image
                                    </button>
                                  )}
                                </>
                              )}
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                    </td>

                    {item.optionValues.map((value, valueIndex) => (
                      <td
                        key={valueIndex}
                        className="p-2 align-top pt-4 text-sm font-medium"
                      >
                        <span className="inline-flex items-center gap-2">
                          <ColorSwatch color={swatchByValue.get(value)} />
                          {value}
                        </span>
                      </td>
                    ))}

                    <td className="p-2 align-top">
                      <Controller
                        name={`variants.${index}.price`}
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name} className="sr-only">
                              Price
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              ref={field.ref}
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={
                                Number.isNaN(field.value) ? "" : field.value
                              }
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? NaN
                                    : Number(e.target.value),
                                )
                              }
                              onBlur={field.onBlur}
                            />
                            {fieldState.invalid && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </Field>
                        )}
                      />
                    </td>

                    <td className="p-2 align-top">
                      <Controller
                        name={`variants.${index}.quantity`}
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name} className="sr-only">
                              Available quantity
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              ref={field.ref}
                              type="number"
                              step="1"
                              min="0"
                              value={
                                Number.isNaN(field.value) ? "" : field.value
                              }
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? NaN
                                    : Number(e.target.value),
                                )
                              }
                              onBlur={field.onBlur}
                            />
                            {fieldState.invalid && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </Field>
                        )}
                      />
                    </td>

                    <td className="p-2 align-top">
                      <Controller
                        name={`variants.${index}.sku`}
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name} className="sr-only">
                              SKU
                            </FieldLabel>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              id={field.name}
                              placeholder="Optional"
                            />
                            {fieldState.invalid && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </Field>
                        )}
                      />
                    </td>
                    <td className="p-2 align-top pt-2.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteVariant(index)}
                        aria-label={`Delete variant ${variantKey(item.optionValues)}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>

                  {expandedIndex === index && (
                    <tr className="border-b border-border bg-muted/40">
                      <td />
                      <td colSpan={optionNames.length + 4} className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
                          <Controller
                            name={`variants.${index}.name`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={field.name}>
                                  Variant name
                                </FieldLabel>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  id={field.name}
                                  placeholder={variantKey(item.optionValues)}
                                />
                                <FieldDescription>
                                  Leave blank to use the option values.
                                </FieldDescription>
                                {fieldState.invalid && (
                                  <FieldError errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />

                          <Controller
                            name={`variants.${index}.description`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={field.name}>
                                  Variant description
                                </FieldLabel>
                                <Textarea
                                  {...field}
                                  value={field.value ?? ""}
                                  id={field.name}
                                  rows={3}
                                  placeholder="Optional details specific to this variant..."
                                />
                                {fieldState.invalid && (
                                  <FieldError errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />

                          <Controller
                            name={`variants.${index}.compareAtPrice`}
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
                                  value={field.value}
                                  onChange={(raw) =>
                                    field.onChange(
                                      raw === "" ? undefined : Number(raw),
                                    )
                                  }
                                  onBlur={field.onBlur}
                                />
                                <FieldDescription>
                                  This variant&apos;s original price, shown
                                  struck through.
                                </FieldDescription>
                                {fieldState.invalid && (
                                  <FieldError errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />

                          <div className="sm:col-span-2 space-y-3">
                            <Controller
                              name={`variants.${index}.isOnSale`}
                              control={control}
                              render={({ field }) => (
                                <CheckboxRow
                                  id={field.name}
                                  label="Mark this variant as on sale"
                                  checked={field.value}
                                  onChange={field.onChange}
                                />
                              )}
                            />

                            {watchedVariants[index]?.isOnSale && (
                              <Controller
                                name={`variants.${index}.saleEndDate`}
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
                                    {fieldState.invalid && (
                                      <FieldError errors={[fieldState.error]} />
                                    )}
                                  </Field>
                                )}
                              />
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Variants are generated from your options. Removing an option value
            removes its variants.
          </p>
        </div>
      )}
    </div>
  );
}
