import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // still needed — sends the httpOnly refreshToken cookie on /auth/refresh
});


export default api;