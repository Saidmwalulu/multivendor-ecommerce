"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import StoreForm from "@/components/dashboard/forms/store-details";
import { getStoreByUrl } from "@/lib/store";

export default function SellerStoreSettingsPage({ params,}: { params: Promise<{ storeURL: string }>;}) {
  
  const { storeURL } = use(params);
  
  const { data: store, isLoading, isError } = useQuery({
    queryKey: ["store", storeURL],
    queryFn: () => getStoreByUrl(storeURL),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError || !store) {
    return <div>Store not found.</div>;
  }

  return (
    <div>
      <StoreForm mode="update" storeId={store.id} defaultValues={{ ...store,
          logo: store.logo ? [{ url: store.logo }] : [],
          cover: store.cover ? [{ url: store.cover }] : [],
        }}
      />
    </div>
  );
}
