import api from "./axios";

export async function getCategories() {
  try {
    const response = await api.get("/categories");

    return response.data.data.categories;
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
}

export async function getCategoryById(categoryId: string) {
  const response = await api.get(`/categories/${categoryId}`);

  return response.data.data.category;
}

export async function createCategory(values: unknown) {
  const response = await api.post("/categories", values);

  return response.data;
}

export async function updateCategory(categoryId: string, values: unknown) {
  const response = await api.patch(`/categories/${categoryId}`, values);

  return response.data;
}

interface DeleteCategoryResponse {
  success: boolean;
  message: string;
}

export async function deleteCategory(categoryId: string): Promise<DeleteCategoryResponse> {
  const response = await api.delete(`/categories/${categoryId}`);

  return response.data;
}

