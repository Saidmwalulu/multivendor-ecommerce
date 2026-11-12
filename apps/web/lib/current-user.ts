import { cookies } from "next/headers";
import axios from "axios";

export async function currentUserServer() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      console.log('no cookies for me')
      return null;
    }

    const response = await axios.get(`${process.env.BACKEND_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data.data.user;
  } catch (error: any) {
    console.error("currentUserServer error:", error.response?.data?.message || error.message);
    return null;
  }
}