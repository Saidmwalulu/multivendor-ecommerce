import api from "./axios";

export async function getSubCategories(categoryId?: string) {
  try {
    const response = await api.get("/sub-categories", {
      params: categoryId ? { categoryId } : undefined,
    });

    return response.data.data.subCategories;
  } catch (error) {
    console.error("Failed to fetch subCategories:", error);
    return [];
  }
}

export async function getSubCategoryById(categoryId: string) {
  const response = await api.get(`/sub-categories/${categoryId}`);

  return response.data.data.subCategory;
}

export async function createSubCategory(values: unknown) {
  const response = await api.post("/sub-categories", values);

  return response.data;
}

export async function updateSubCategory(categoryId: string, values: unknown) {
  const response = await api.patch(`/sub-categories/${categoryId}`, values);

  return response.data;
}

export async function deleteSubCategory(categoryId: string) {
  const response = await api.delete(`/sub-categories/${categoryId}`);

  return response.data;
}