import { SubCategoriesDataTable } from "@/components/dashboard/data-table/sub-category-data-table";
import { getSubCategories } from "@/lib/sub-category";

export default async function AdminSubCategoriesPage() {
    const subCategories = await getSubCategories();
    
    return (
        <div className="p-3 bg-white">
            <SubCategoriesDataTable data={subCategories} />
        </div>
    )
}