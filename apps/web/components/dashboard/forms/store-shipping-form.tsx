"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateStoreShipping,
  type StoreShippingDetails,
} from "@/lib/store"; // adjust to where you put it

const SHIPPING_SERVICES = [
  "International Delivery",
  "Worldwide Priority",
  "Standard Domestic Express",
  "Local Ground",
];

// Tip: move this into @repo/shared so the backend can validate with the same schema.
const shippingSchema = z
  .object({
    defaultShippingService: z.string().min(1, "Select a shipping service"),
    defaultShippingFeeFixed: z.number().min(0, "Must be 0 or more"),
    defaultShippingFeePerItem: z.number().min(0, "Must be 0 or more"),
    defaultShippingFeeForAdditionalItem: z.number().min(0, "Must be 0 or more"),
    defaultShippingFeePerKg: z.number().min(0, "Must be 0 or more"),
    defaultDeliveryTimeMin: z.number().int("Whole days only").min(1, "At least 1 day"),
    defaultDeliveryTimeMax: z.number().int("Whole days only").min(1, "At least 1 day"),
    returnPolicy: z.string().min(1, "Return policy is required"),
  })
  .refine((v) => v.defaultDeliveryTimeMin <= v.defaultDeliveryTimeMax, {
    message: "Max must be greater than or equal to min",
    path: ["defaultDeliveryTimeMax"],
  });

type ShippingFormValues = z.infer<typeof shippingSchema>;

const FEE_FIELDS = [
  {
    name: "defaultShippingFeeFixed",
    label: "Default Shipping Fee Fixed",
    badge: "Fixed",
    suffix: "USD",
    hint: "Flat handling or dispatch base cost.",
  },
  {
    name: "defaultShippingFeePerItem",
    label: "Default Shipping Fee Per Item",
    badge: "Per Item",
    suffix: "USD",
    hint: "Calculated per line-item unit in the order.",
  },
  {
    name: "defaultShippingFeeForAdditionalItem",
    label: "Default Shipping Fee For Additional Item",
    badge: "+Unit",
    suffix: "USD",
    hint: "Fee applied to additional pieces beyond the first.",
  },
  {
    name: "defaultShippingFeePerKg",
    label: "Default Shipping Fee Per Kg",
    badge: "Per Kg",
    suffix: "/ kg",
    hint: "Variable rate based on package total weight.",
  },
] as const;

const DELIVERY_FIELDS = [
  {
    name: "defaultDeliveryTimeMin",
    label: "Default Delivery Time Min",
    hint: "Minimum expected transit time.",
  },
  {
    name: "defaultDeliveryTimeMax",
    label: "Default Delivery Time Max",
    hint: "Maximum expected transit time.",
  },
] as const;

// Shared look for the inner "tile" that wraps each small field.
const tileClass = "gap-2 rounded-lg border bg-slate-50 p-4";

// Shared look for the small status pills in the header.
const pillClass = "rounded-full border px-3 py-1 text-xs font-medium";

export function StoreShippingForm({
  storeURL,
  initialData,
}: {
  storeURL: string;
  initialData: StoreShippingDetails;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    defaultValues: initialData,
  });

  const mutation = useMutation({
    mutationFn: (values: ShippingFormValues) => updateStoreShipping(storeURL, values),
    onSuccess: (saved) => {
      toast.success("Shipping details saved");
      queryClient.setQueryData(["store-shipping", storeURL], saved);
      form.reset(saved); // marks the form as "not dirty" again
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save changes");
    },
  });

  // Live values for the header pills.
  const currentService = form.watch("defaultShippingService");
  const [minDays, maxDays] = form.watch(["defaultDeliveryTimeMin", "defaultDeliveryTimeMax"]);
  const daysText = (n: number) => (Number.isNaN(n) ? "--" : n);

  // If the saved service isn't one of our presets, still show it in the dropdown.
  const serviceOptions = SHIPPING_SERVICES.includes(currentService)
    ? SHIPPING_SERVICES
    : [currentService, ...SHIPPING_SERVICES];

  const isSaving = mutation.isPending;

  return (
    <form
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="flex w-full flex-col gap-8 p-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Truck className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight tracking-tight">
              Shipping Details
            </h1>
            <p className="text-xs text-muted-foreground">/{storeURL}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`${pillClass} bg-slate-50`}>{currentService}</span>
          <span className={`${pillClass} bg-slate-50`}>
            {daysText(minDays)}–{daysText(maxDays)} days
          </span>
          {form.formState.isDirty ? (
            <span className={`${pillClass} border-amber-200 bg-amber-50 text-amber-700`}>
              Unsaved changes
            </span>
          ) : (
            <span className={`${pillClass} border-emerald-200 bg-emerald-50 text-emerald-700`}>
              All changes saved
            </span>
          )}
        </div>
      </div>

      {/* Default shipping service */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <Controller
          name="defaultShippingService"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name} className="text-lg font-semibold">
                Default Shipping Service
              </FieldLabel>
              <FieldDescription>
                Primary carrier method applied to standard shipments.
              </FieldDescription>
              <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  className="h-11 w-full max-w-md bg-slate-50"
                >
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {serviceOptions.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </section>

      {/* Shipping fees */}
      <section className="flex flex-col gap-6 rounded-xl border bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Shipping Fee Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Base charges, unit quantity rates, and dimensional weight fees.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {FEE_FIELDS.map((item) => (
            <Controller
              key={item.name}
              name={item.name}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className={tileClass}>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel htmlFor={field.name} className="font-semibold">
                      {item.label}
                    </FieldLabel>
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.badge}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>
                    <Input
                      {...field}
                      id={field.name}
                      type="number"
                      min={0}
                      step="0.01"
                      aria-invalid={fieldState.invalid}
                      className="bg-white pl-7 pr-14"
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      value={Number.isNaN(field.value) ? "" : field.value}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                      {item.suffix}
                    </span>
                  </div>
                  <FieldDescription>{item.hint}</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          ))}
        </div>
      </section>

      {/* Delivery window */}
      <section className="flex flex-col gap-6 rounded-xl border bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Delivery Time Window</h2>
          <p className="text-sm text-muted-foreground">
            Estimated minimum and maximum business days required for transit.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {DELIVERY_FIELDS.map((item) => (
            <Controller
              key={item.name}
              name={item.name}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className={tileClass}>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor={field.name} className="font-semibold">
                      {item.label}
                    </FieldLabel>
                    <span className="text-xs font-medium text-indigo-600">Days</span>
                  </div>
                  <div className="relative">
                    <Input
                      {...field}
                      id={field.name}
                      type="number"
                      min={1}
                      step={1}
                      aria-invalid={fieldState.invalid}
                      className="bg-white pr-14"
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      value={Number.isNaN(field.value) ? "" : field.value}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                      Days
                    </span>
                  </div>
                  <FieldDescription>{item.hint}</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          ))}
        </div>
      </section>

      {/* Return policy */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <Controller
          name="returnPolicy"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name} className="text-lg font-semibold">
                Return Policy
              </FieldLabel>
              <FieldDescription>
                Customer policy terms and return window description.
              </FieldDescription>
              <Textarea
                {...field}
                id={field.name}
                rows={4}
                aria-invalid={fieldState.invalid}
                className="resize-y bg-slate-50"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </section>

      {/* Sticky action bar: stays at the bottom while the page scrolls */}
      <div className="sticky bottom-0 -mx-6 -mb-6 border-t bg-white/90 px-6 py-4 backdrop-blur">
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Check />}
            Save Changes
          </Button>
        </div>
      </div>
    </form>
  );
}
