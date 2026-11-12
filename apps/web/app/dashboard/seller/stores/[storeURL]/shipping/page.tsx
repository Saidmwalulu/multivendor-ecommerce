"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe, SlidersHorizontal } from "lucide-react";

import { StoreShippingForm } from "@/components/dashboard/forms/store-shipping-form";
import { ShippingRatesDataTable } from "@/components/dashboard/data-table/shipping-rates-data-table"; // adjust to where you put it
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  defaultStoreShipping,
  getStoreShippingRates,
  type StoreShippingDetails,
} from "@/lib/store";

// The table's data is only fetched when this tab is opened, because inactive tabs
// aren't mounted. The defaults are passed in so countries without a rate can show them.
function CountryRatesTab({
  storeURL,
  defaults,
}: {
  storeURL: string;
  defaults: StoreShippingDetails;
}) {
  const { data: rates, isLoading, isError, error } = useQuery({
    queryKey: ["store-shipping-rates", storeURL],
    queryFn: () => getStoreShippingRates(storeURL),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  if (isError || !rates) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load country rates."}
      </p>
    );
  }

  return <ShippingRatesDataTable storeURL={storeURL} data={rates} defaults={defaults} />;
}

export default function SellerStoreShippingPage({
  params,
}: {
  params: Promise<{ storeURL: string }>;
}) {
  const { storeURL } = use(params);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["store-shipping", storeURL],
    queryFn: () => defaultStoreShipping(storeURL),
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-6 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full p-6 text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load shipping details."}
      </div>
    );
  }

  return (
    <Tabs defaultValue="defaults" className="w-full gap-0">
      <div className="sticky top-12 z-20 border-b bg-background px-6 pt-1">
        <h1 className="text-2xl font-semibold tracking-tight">Shipping</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Set your store-wide defaults, or fine-tune the rates for each country.
        </p>
        <TabsList>
          <TabsTrigger value="defaults">
            <SlidersHorizontal className="size-4" />
            Store defaults
          </TabsTrigger>
          <TabsTrigger value="countries">
            <Globe className="size-4" />
            Country rates
          </TabsTrigger>
        </TabsList>
      </div>

      {/* forceMount + hidden keeps the form mounted, so unsaved edits survive a tab switch */}
      <TabsContent value="defaults" forceMount className="data-[state=inactive]:hidden">
        <StoreShippingForm storeURL={storeURL} initialData={data} />
      </TabsContent>

      <TabsContent value="countries" className="p-6">
        <CountryRatesTab storeURL={storeURL} defaults={data} />
      </TabsContent>
    </Tabs>
  );
}