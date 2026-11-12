"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  saveStoreShippingRate,
  type CountryShippingRate,
  type StoreShippingDetails,
} from "@/lib/store"; // adjust to where you put it

const SHIPPING_SERVICES = [
  "International Delivery",
  "Worldwide Priority",
  "Standard Domestic Express",
  "Local Ground",
];

// Tip: move this into @repo/shared so the backend can validate with the same fields.
const rateSchema = z
  .object({
    shippingService: z.string().min(1, "Select a shipping service"),
    shippingFeeFixed: z.number().min(0, "Must be 0 or more"),
    shippingFeePerItem: z.number().min(0, "Must be 0 or more"),
    shippingFeeForAdditionalItem: z.number().min(0, "Must be 0 or more"),
    shippingFeePerKg: z.number().min(0, "Must be 0 or more"),
    deliveryTimeMin: z.number().int("Whole days only").min(1, "At least 1 day"),
    deliveryTimeMax: z.number().int("Whole days only").min(1, "At least 1 day"),
    returnPolicy: z.string().min(1, "Return policy is required"),
  })
  .refine((v) => v.deliveryTimeMin <= v.deliveryTimeMax, {
    message: "Max must be greater than or equal to min",
    path: ["deliveryTimeMax"],
  });

type RateFormValues = z.infer<typeof rateSchema>;

const FEE_FIELDS = [
  { name: "shippingFeeFixed", label: "Fixed fee", suffix: "USD" },
  { name: "shippingFeePerItem", label: "Fee per item", suffix: "USD" },
  { name: "shippingFeeForAdditionalItem", label: "Fee for additional item", suffix: "USD" },
  { name: "shippingFeePerKg", label: "Fee per kg", suffix: "/ kg" },
] as const;

const DAY_FIELDS = [
  { name: "deliveryTimeMin", label: "Delivery time min" },
  { name: "deliveryTimeMax", label: "Delivery time max" },
] as const;

type DialogCountry = Pick<CountryShippingRate, "id" | "name" | "shippingRate">;

interface ShippingRateFormDialogProps {
  storeURL: string;
  country: DialogCountry;
  defaults: StoreShippingDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShippingRateFormDialog({
  storeURL,
  country,
  defaults,
  open,
  onOpenChange,
}: ShippingRateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit rate: {country.name}</DialogTitle>
          <DialogDescription>
            Values start from this country's rate, or the store defaults if it has none.
          </DialogDescription>
        </DialogHeader>

        {/* Only mounted while the dialog is open, so the form restarts from fresh values each time. */}
        <RateForm
          storeURL={storeURL}
          country={country}
          defaults={defaults}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function RateForm({
  storeURL,
  country,
  defaults,
  onClose,
}: {
  storeURL: string;
  country: DialogCountry;
  defaults: StoreShippingDetails;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  // Start from the country's own rate, or from the store defaults if it has none.
  const existing = country.shippingRate;

  const form = useForm<RateFormValues>({
    resolver: zodResolver(rateSchema),
    defaultValues: {
      shippingService: existing?.shippingService ?? defaults.defaultShippingService,
      shippingFeeFixed: existing?.shippingFeeFixed ?? defaults.defaultShippingFeeFixed,
      shippingFeePerItem: existing?.shippingFeePerItem ?? defaults.defaultShippingFeePerItem,
      shippingFeeForAdditionalItem:
        existing?.shippingFeeForAdditionalItem ?? defaults.defaultShippingFeeForAdditionalItem,
      shippingFeePerKg: existing?.shippingFeePerKg ?? defaults.defaultShippingFeePerKg,
      deliveryTimeMin: existing?.deliveryTimeMin ?? defaults.defaultDeliveryTimeMin,
      deliveryTimeMax: existing?.deliveryTimeMax ?? defaults.defaultDeliveryTimeMax,
      returnPolicy: existing?.returnPolicy ?? defaults.returnPolicy,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: RateFormValues) => saveStoreShippingRate(storeURL, country.id, values),
    onSuccess: (data) => {
      toast.success(data.message ?? "Shipping rate saved");
      queryClient.invalidateQueries({ queryKey: ["store-shipping-rates", storeURL] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Could not save the rate");
    },
  });

  const currentService = form.watch("shippingService");
  const serviceOptions = SHIPPING_SERVICES.includes(currentService)
    ? SHIPPING_SERVICES
    : [currentService, ...SHIPPING_SERVICES];

  return (
    <form
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-5"
    >
      <Controller
        name="shippingService"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Shipping service</FieldLabel>
            <Select name={field.name} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id={field.name} aria-invalid={fieldState.invalid} className="w-full">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FEE_FIELDS.map((item) => (
          <Controller
            key={item.name}
            name={item.name}
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{item.label}</FieldLabel>
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
                    className="pl-7 pr-14"
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    value={Number.isNaN(field.value) ? "" : field.value}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    {item.suffix}
                  </span>
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        ))}

        {DAY_FIELDS.map((item) => (
          <Controller
            key={item.name}
            name={item.name}
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{item.label}</FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={1}
                    step={1}
                    aria-invalid={fieldState.invalid}
                    className="pr-14"
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    value={Number.isNaN(field.value) ? "" : field.value}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    Days
                  </span>
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        ))}
      </div>

      <Controller
        name="returnPolicy"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Return policy</FieldLabel>
            <Textarea
              {...field}
              id={field.name}
              rows={3}
              aria-invalid={fieldState.invalid}
              className="resize-y"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {mutation.isPending && <Loader2 className="animate-spin" />}
          Save rate
        </Button>
      </DialogFooter>
    </form>
  );
}
