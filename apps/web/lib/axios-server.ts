import axios from "axios";
import { cookies } from "next/headers";

export async function getServerApi() {
  const cookieStore = await cookies();

  return axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieStore.toString(),
    },
    withCredentials: true,
  });
}