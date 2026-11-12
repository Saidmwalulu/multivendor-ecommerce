import api from "./axios";

export async function currentUserClient() {
 
  try {
    const response = await api.get("/auth/me");

    return response.data.data.user;

  } catch (error: any) {
    const message = error.response?.data?.message
    console.error("Failed to fetch current user on client side:", message);

    return null;
  }
}