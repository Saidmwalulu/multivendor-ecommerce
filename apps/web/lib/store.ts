import api from "./axios";

export interface Store {
  id: string;
  name: string;
  description: string;
  email: string;
  phone: string;
  url: string;
  logo: string;
  cover: string;
  status: "PENDING" | "ACTIVE" | "BANNED" | "DISABLED"
  averageRating: number;
  numReviews: number;
  featured: boolean;
  returnPolicy: string;
  defaultShippingService: string;
  defaultShippingFeePerItem: number;
  defaultShippingFeeForAdditionalItem: number;
  defaultShippingFeePerKg: number;
  defaultShippingFeeFixed: number;
  defaultDeliveryTimeMin: number;
  defaultDeliveryTimeMax: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export type StoreShippingDetails = Pick<
  Store,
  | "defaultShippingService"
  | "defaultShippingFeePerItem"
  | "defaultShippingFeeForAdditionalItem"
  | "defaultShippingFeePerKg"
  | "defaultShippingFeeFixed"
  | "defaultDeliveryTimeMin"
  | "defaultDeliveryTimeMax"
  | "returnPolicy"
>;

type StoreShippingResponse = {
  success: boolean;
  message?: string;
  data: { shippingDetails: StoreShippingDetails };
};

export interface ShippingRate {
  id: string;
  storeId: string;
  countryId: string;
  shippingService: string;
  shippingFeeFixed: number;
  shippingFeePerItem: number;
  shippingFeeForAdditionalItem: number;
  shippingFeePerKg: number;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  returnPolicy: string;
}

export interface CountryShippingRate {
  id: string;
  name: string;
  code: string;
  shippingRate: ShippingRate | null; // null = store hasn't set a rate for this country
}

export type ShippingRateValues = Pick<
  ShippingRate,
  | "shippingService"
  | "shippingFeeFixed"
  | "shippingFeePerItem"
  | "shippingFeeForAdditionalItem"
  | "shippingFeePerKg"
  | "deliveryTimeMin"
  | "deliveryTimeMax"
  | "returnPolicy"
>;

type StoreShippingRatesResponse = {
  success: boolean;
  data: { shippingRates: CountryShippingRate[] };
};

export async function getStores() {
  try {
    const response = await api.get(`/stores`);

    return response.data.data.stores;
  } catch (error) {
    console.error("Failed to fetch stores:", error);
  }
}

export async function getStoreByUrl(storeURL: string) {
  const response = await api.get(`/stores/name/${storeURL}`);

  return response.data.data.store;
}

export async function getStoreById(storeId: string) {
  const response = await api.get(`/stores/${storeId}`);

  return response.data.data.store;
}

export async function createStore(values: unknown) {
  const response = await api.post("/stores", values);

  return response.data;
}

export async function updateStore(storeId: string, values: unknown) {
  const response = await api.patch(`/stores/${storeId}`, values);

  return response.data;
}

export async function defaultStoreShipping(storeURL: string) {
  const response = await api.get(`/stores/name/${storeURL}/shipping-details`)

  return response.data.data.shippingDetails;
}

export async function getStoreShippingRates(storeURL: string) {
  const response = await api.get<StoreShippingRatesResponse>(
    `/stores/name/${storeURL}/shipping-rates`,
  );

  return response.data.data.shippingRates;
}

// Creates or updates the rate for one country
export async function saveStoreShippingRate(storeURL: string, countryId: string, values: ShippingRateValues) {
  const response = await api.put(`/stores/name/${storeURL}/shipping-rates/${countryId}`,values);

  return response.data;
}

// Removes the custom rate, so the country falls back to the store default
export async function resetStoreShippingRate(storeURL: string, countryId: string) {
  const response = await api.delete(`/stores/name/${storeURL}/shipping-rates/${countryId}`);

  return response.data;
}

export async function updateStoreShipping(storeURL: string, values: StoreShippingDetails ) {
  const response = await api.patch<StoreShippingResponse>(`/stores/name/${storeURL}/shipping-details`,values);

  return response.data.data.shippingDetails;
}

export async function deleteStore(storeId: string) {
  const response = await api.delete(`/stores/${storeId}`);

  return response.data;
}