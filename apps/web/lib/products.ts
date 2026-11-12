import api  from "./axios";
// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface GetProductsParams {
  storeId?: string;
  categoryId?: string;
  subCategoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "newest" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
}

export interface ProductPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface GetProductsResult {
  products: unknown[];
  pagination: ProductPagination | null;
}

interface DeleteProductResponse {
  success: boolean;
  message: string;
}

// ---------------------------------------------------------------------
// Public — storefront
// ---------------------------------------------------------------------

// Only ACTIVE products come back from this endpoint — DRAFT/ARCHIVED never
// leak into public listings, that's enforced server-side.
export async function getProducts(params?: GetProductsParams): Promise<GetProductsResult> {
  try {
    const response = await api.get("/products", { params });

    return {
      products: response.data.data.products,
      pagination: response.data.data.pagination,
    };
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return { products: [], pagination: null };
  }
}

export async function getProductForStore(storeId: string, productId: string) {
  const response = await api.get(`products/seller/${storeId}/${productId}`);

  return response.data.data.product;
}

export async function getProductById(productId: string) {
  const response = await api.get(`/products/${productId}`);

  return response.data.data.product;
}

// ---------------------------------------------------------------------
// Seller dashboard — scoped to one store, requires auth
// ---------------------------------------------------------------------

// Unlike getProducts, this includes the store's DRAFT and ARCHIVED products
// too — it's the seller's own view of their full catalog, not the storefront.
export async function getStoreProducts(storeId: string, accessToken?: string) {
  try {
    const response = await api.get(`/products/seller/${storeId}`, {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    });

    return response.data.data.products;
  } catch (error) {
    console.error("Failed to fetch store products:", error);
    return [];
  }
}

export async function createProduct(storeId: string, values: unknown) {
  const response = await api.post(`/products/${storeId}`, values);

  return response.data;
}


export async function updateProduct(storeId: string, productId: string, values: unknown) {
  const response = await api.patch(`/products/${storeId}/${productId}`, values);

  return response.data;
}

// Separate from updateProduct — publishing/archiving is a one-field change
// and shouldn't require resubmitting the entire product form.
export async function updateProductStatus(storeId: string, productId: string, status: ProductStatus) {
  const response = await api.patch(`/products/${storeId}/${productId}/status`, { status });

  return response.data;
}

export async function deleteProduct(storeId: string, productId: string): Promise<DeleteProductResponse> {
  const response = await api.delete(`/products/${storeId}/${productId}`);

  return response.data;
}