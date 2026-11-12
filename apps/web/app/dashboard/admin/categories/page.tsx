import { CategoriesDataTable } from "@/components/dashboard/data-table/categories-data-table";
import { getCategories } from "@/lib/category";


export default async function AdminCategoriesPage() {
  const categories = await getCategories();
    return (
        <div className="p-3 bg-white">
            <CategoriesDataTable data={categories} />
        </div>
    )
}