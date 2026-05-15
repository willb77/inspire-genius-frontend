import axios from "axios";
import { toast } from "sonner";

export const magicAuthApi = axios.create({
  baseURL: import.meta.env.VITE_MAGIC_AUTH_URL || "http://localhost:8001",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Response interceptor — surface errors to user instead of silently failing
magicAuthApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      toast.error("Request timed out. Please try again.");
    } else if (!error.response) {
      toast.error("Unable to reach the authentication service. Please check your connection.");
    }
    return Promise.reject(error);
  }
);
