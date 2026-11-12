// lib/seller-stores-server.ts

import { cookies } from "next/headers";
import axios from "axios";

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

interface StoresResponse {
  success: boolean;
  message: string;
  data: {
    stores: Store[];
  };
}

export async function sellerStoresServer(): Promise<Store[] | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      console.log("❌ No access token found");
      return null;
    }

    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/stores`;

    const response = await axios.get<StoresResponse>(apiUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
    });

    return response.data.data.stores;
  } catch (error: any) {
    console.error(
      "Store fetch error:",
      error.response?.data?.message || error.message
    );

    return null;
  }
}