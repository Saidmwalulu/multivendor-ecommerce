import { AddProductForm, type CategoryOption } from '@/components/dashboard/forms/product-form/add-product-form'
import { getCategories } from '@/lib/category';
import { getStoreByUrl } from '@/lib/store';
import React from 'react'

interface SellerNewProductPageProps {
  params: Promise<{ storeURL: string }>;
}

export default async function SellerNewProductPage({ params }: SellerNewProductPageProps) {
  const { storeURL } = await params;

  const [store, categories ] = await Promise.all([
    getStoreByUrl(storeURL),
    getCategories(),
  ]);

  return (
    <div className="fixed top-8 right-0 bottom-0 lg:left-[var(--sidebar-width,16rem)] left-0 overflow-hidden">
      <AddProductForm 
        storeId={store.id} 
        storeURL={storeURL}
        categories={categories as CategoryOption[]} 
      />
    </div>
  )
}
