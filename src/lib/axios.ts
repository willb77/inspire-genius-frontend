import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { getToken, clearAuth } from '@/lib/storage'

// Configure a shared Axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  withCredentials: true,
})

// Initialize default access-token header from encrypted storage (once at startup)
;(async function initAuthHeader() {
  try {
    const token = await getToken()
    if (token) api.defaults.headers.common['access-token'] = token
  } catch { void 0 }
})()

// Attach token per-request from encrypted storage (source of truth)
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    const token = await getToken()
    if (token) config.headers.set?.('access-token', token)
  } catch { void 0 }
  return config
})

api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (err: AxiosError) => {
    // Global 401 handling
    if (err?.response?.status === 401) {
      clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export function syncAuthToken(token: string | null) {
  if (token) api.defaults.headers.common['access-token'] = token
  else delete api.defaults.headers.common['access-token']
}
