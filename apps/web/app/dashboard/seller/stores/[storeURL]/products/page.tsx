import { ProductsDataTable } from "@/components/dashboard/data-table/products-data-table";
import { getCategories } from "@/lib/category";
import { getStoreProducts } from "@/lib/products";
import { getStoreByUrl } from "@/lib/store";
import { cookies } from "next/headers";

interface SellerProductsPageProps {
  params: Promise<{ storeURL: string }>;
}

export default async function SellerStoreProductsPage({ params }: SellerProductsPageProps) {
    const { storeURL } = await params;
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    const store = await getStoreByUrl(storeURL);

    const [products, categories] = await Promise.all([
        getStoreProducts(store.id, accessToken),
        getCategories(),
    ]);

    return (
        <div className="p-3 bg-white"> 
            <ProductsDataTable
                data={products}
                storeId={store.id}
                storeURL={storeURL}
                categories={categories}
            />
        </div>
    )
}