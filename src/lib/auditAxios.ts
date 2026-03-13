import axios from "axios"

export const auditApi = axios.create({
  baseURL: import.meta.env.VITE_AUDIT_SERVICE_URL || "http://localhost:8008",
})

auditApi.interceptors.request.use((config) => {
  const apiKey = import.meta.env.VITE_AUDIT_API_KEY
  if (apiKey) {
    config.headers.set?.("X-API-Key", apiKey)
  }
  return config
})
