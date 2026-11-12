"use client";

import { type ChangeEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Phone, Globe, Upload, Image as ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { StoreFormSchema } from "@repo/shared";
import type { z } from "zod";
import { getStoreById, type Store } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { toast } from "sonner";
import { currentUserClient } from "@/lib/current-user2";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

type StoreFormInput = z.input<typeof StoreFormSchema>;
type StoreFormOutput = z.output<typeof StoreFormSchema>;

const STATUS_OPTIONS: { value: StoreFormOutput["status"]; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "BANNED", label: "Banned" },
  {value: "DISABLED", label: "Disabled"}
];

const EMPTY_DEFAULTS: StoreFormInput = {
  name: "",
  description: "",
  logo: [],
  cover: [],
  featured: false,
  email: "",
  phone: "",
  url: "",
  status: "PENDING",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StoreFormProps {
  mode: "create" | "update";
  storeId?: string; // required when mode === "update"
  defaultValues?: Partial<StoreFormInput>; // existing store values, for update
  onSuccess?: (store: Store) => void;
}

export default function StoreForm({ mode, storeId, defaultValues, onSuccess }: StoreFormProps) {

  const router = useRouter();
  const queryClient = useQueryClient();

  // Existing store, when editing — mirrors SubCategoryDetailsForm's pattern.
  const { data: existingStore, isLoading: isLoadingExisting } = useQuery({
    queryKey: ["stores", storeId],
    queryFn: () => getStoreById(storeId as string),
    enabled: !!storeId,
  });

  const { data: user, isLoading, error} = useQuery({
    queryKey: ["current-user"],
    queryFn: currentUserClient
  })
  
  const form = useForm<StoreFormInput, any, StoreFormOutput>({
    resolver: zodResolver(StoreFormSchema),
    defaultValues: EMPTY_DEFAULTS,
    values: existingStore
      ? {
          name: existingStore.name,
          description: existingStore.description,
          email: existingStore.email,
          phone: existingStore.phone,
          url: existingStore.url,
          status: existingStore.status,
          featured: existingStore.featured,
          logo: [{ url: existingStore.logo }],
          cover: [{ url: existingStore.cover }],
        }
      : undefined,
  });

  // // Populate the form once existing store data is available (update mode).
  // useEffect(() => {
  //   if (defaultValues) {
  //     form.reset({ 
  //       ...EMPTY_DEFAULTS, 
  //       ...defaultValues
  //     });
  //   }
  // }, [defaultValues, form]);

  const mutation = useMutation({
    mutationFn: async (values: StoreFormOutput) => {
      // In update mode, only resend logo/cover if the user picked a new
      // image (a fresh base64 data URI). Resending the existing hosted URL
      // would make the backend delete-then-"replace" the image with itself.
      if (mode === "update") {
        const { logo, cover, ...rest } = values;
        const payload = {
          ...rest,
          ...(logo[0]?.url.startsWith("data:") && { logo }),
          ...(cover[0]?.url.startsWith("data:") && { cover }),
        };
        return api.patch(`/stores/${storeId}`, payload);
      }
      return api.post("/stores", values);
    },
    onSuccess: (data) => {
      console.log("onSuccess payload:", data.data); // inspect actual shape
      const store = data.data.data.store;
      toast.success(data.data.message);

      queryClient.invalidateQueries({ queryKey: ["stores"] });

      if (onSuccess) {
        onSuccess(data.data.data.store);
      } else {
        //router.push(`/dashboard/seller/stores/${store.url}`);
        router.refresh();
      }
    },
    onError: (error: any) => {
      console.error("Mutation error:", error); // see the REAL error, not just the toast fallback
      toast.error(error.response?.data?.message || "Something went wrong");
    },
  });


  function handleImageChange(e: ChangeEvent<HTMLInputElement>, onChange: (value: { url: string }[]) => void,) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onChange([{ url: reader.result as string }]);
    };
    reader.readAsDataURL(file);
  }

  function onSubmit(values: StoreFormOutput) {
    mutation.mutate(values);
  }

  const isSubmitting = form.formState.isSubmitting || mutation.isPending;
  const submitLabel = mode === "update" ? "Save Changes" : "Create Store";
  const pendingLabel = mode === "update" ? "Saving..." : "Creating...";

  return (
    <div className="flex min-h-screen flex-col text-foreground antialiased">
      <main className="mx-auto w-full max-w-[1400px] pt-7">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Cover + logo */}
          <div className="relative w-full">
            {/* Cover image sits in its own clipped box */}
            <Controller
              control={form.control}
              name="cover"
              render={({ field, fieldState }) => {
                const coverPreview = field.value?.[0]?.url ?? null;
                return (
                  <>
                    <div className="group relative h-40 w-full overflow-hidden bg-muted md:h-56">
                      {coverPreview ? (
                        <div
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url('${coverPreview}')` }}
                          role="img"
                          aria-label="Store cover image"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-border text-muted-foreground">
                          <ImageIcon className="size-8" />
                          <span className="text-sm font-medium">
                            No cover image selected
                          </span>
                        </div>
                      )}
                      <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="flex items-center gap-2 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent">
                          <Upload className="size-4" />
                          {coverPreview ? "Change Cover Image" : "Upload Cover Image"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => handleImageChange(e, field.onChange)}
                        />
                      </label>
                    </div>
                    {fieldState.invalid && (
                      <p className="px-4 pt-1 text-sm text-destructive md:px-8">
                        {fieldState.error?.message}
                      </p>
                    )}
                  </>
                );
              }}
            />

            {/* Logo floats on top of the cover box, unclipped, so it can overlap below it */}
            <Controller
              control={form.control}
              name="logo"
              render={({ field, fieldState }) => {
                const logoPreview = field.value?.[0]?.url ?? null;
                return (
                  <label className="group/logo absolute -bottom-16 left-4 z-10 cursor-pointer md:left-8">
                    <div
                      className="relative flex size-32 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted shadow-md md:size-40"
                      data-invalid={fieldState.invalid}
                    >
                      {logoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="size-full object-cover"
                          src={logoPreview}
                          alt="Store logo"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <ImageIcon className="size-8" />
                          <span className="text-[11px] font-medium">No logo</span>
                        </div>
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-background opacity-0 transition-opacity group-hover/logo:opacity-100">
                        <Upload className="mb-1 size-4" />
                        <span className="text-xs font-semibold">
                          {logoPreview ? "Change Logo" : "Upload Logo"}
                        </span>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => handleImageChange(e, field.onChange)}
                    />
                  </label>
                );
              }}
            />
          </div>
          {form.formState.errors.logo && (
            <p className="px-4 pt-20 text-sm text-destructive md:px-8 md:pt-24">
              {form.formState.errors.logo.message}
            </p>
          )}

          <div
            className={
              form.formState.errors.logo || form.formState.errors.cover
                ? "mt-4 mb-12 grid grid-cols-1 gap-6 px-4 md:px-8 lg:grid-cols-12"
                : "mt-20 mb-12 grid grid-cols-1 gap-6 px-4 md:px-8 lg:grid-cols-12"
            }
          >
            {/* Store information */}
            <div className="lg:col-span-8">
              <Card>
                <CardHeader>
                  <CardTitle>Store Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Controller
                      control={form.control}
                      name="name"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="name">Store Name</FieldLabel>
                          <Input
                            id="name"
                            placeholder="Enter your store name"
                            aria-invalid={fieldState.invalid}
                            {...field}
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="description"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="description">
                            Store Description
                          </FieldLabel>
                          <Textarea
                            id="description"
                            placeholder="Tell customers what your store is about"
                            rows={4}
                            aria-invalid={fieldState.invalid}
                            {...field}
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <FieldSeparator />

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <Controller
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <Field orientation="horizontal">
                            <FieldLabel htmlFor="status">Status</FieldLabel>
                            <Select
                              value={field.value ?? "PENDING"}
                              onValueChange={(value) => {
                                if (user?.role !== 'ADMIN') {
                                  toast.info("Only an admin can change the store status.");
                                  return;
                                }
                                field.onChange(value as StoreFormOutput["status"]);
                              }}
                            >
                              <SelectTrigger id="status" className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        )}
                      />

                      <Controller
                        control={form.control}
                        name="featured"
                        render={({ field }) => (
                          <Field orientation="horizontal">
                            <FieldLabel htmlFor="featured">
                              Featured Brand
                            </FieldLabel>
                            <Switch
                              id="featured"
                              checked={field.value ?? false}
                              onCheckedChange={(checked) => {
                                if (user?.role !== "ADMIN") {
                                  toast.info("Only an admin can feature a store.");
                                  return;
                                }
                                field.onChange(checked);
                              }}
                              className={cn(user?.role !== "ADMIN" && "cursor-not-allowed opacity-60")}
                            />
                          </Field>
                        )}
                      />
                    </div>
                  </FieldGroup>
                </CardContent>
              </Card>
            </div>

            {/* Contact details */}
            <div className="lg:col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Controller
                      control={form.control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="email">Email Address</FieldLabel>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                            <Input
                              id="email"
                              type="email"
                              className="pl-10"
                              aria-invalid={fieldState.invalid}
                              {...field}
                            />
                          </div>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="phone"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                          <div className="relative">
                            <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                            <Input
                              id="phone"
                              type="tel"
                              className="pl-10"
                              aria-invalid={fieldState.invalid}
                              {...field}
                            />
                          </div>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="url"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="url">Store URL</FieldLabel>
                          <div className="relative">
                            <Globe className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                            <Input
                              id="url"
                              className="pl-10"
                              placeholder="my-store"
                              aria-invalid={fieldState.invalid}
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value.toLowerCase())
                              }
                            />
                          </div>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="mt-1 flex justify-end gap-3 border-t pt-6 lg:col-span-12">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? pendingLabel : submitLabel}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
