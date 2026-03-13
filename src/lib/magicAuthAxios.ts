import axios from "axios"

export const magicAuthApi = axios.create({
  baseURL: import.meta.env.VITE_MAGIC_AUTH_URL || "http://localhost:8001",
})
