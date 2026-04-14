import axios, { type AxiosInstance, type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { getToken, getRefreshToken, setToken, clearAuth } from '@/lib/storage'

// single-flight refresh and per-request retry guard
let refreshPromise: Promise<string | null> | null = null
const retriedRequests = new WeakSet<InternalAxiosRequestConfig>()

/**
 * Attach shared interceptors (auth token injection + 401 refresh) to any axios instance.
 * Both `api` and `agentApi` call this so the logic is never duplicated.
 */
export function attachInterceptors(instance: AxiosInstance) {
  // Attach token per-request from encrypted storage (source of truth)
  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await getToken()
      if (token) config.headers.set?.('access-token', token)
    } catch { (() => {})() }
    return config
  })

  instance.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (err: AxiosError) => {
      const response = err.response
      const original = err.config as InternalAxiosRequestConfig | undefined
      if (!response || !original) return Promise.reject(err)

      if (response.status !== 401) return Promise.reject(err)

      // prevent retry loops per request
      if (!retriedRequests.has(original)) {
        retriedRequests.add(original)
      } else {
        await clearAuth()
        window.location.href = '/login'
        return Promise.reject(err)
      }

      const rToken = await getRefreshToken()
      if (!rToken) {
        await clearAuth()
        window.location.href = '/login'
        return Promise.reject(err)
      }

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post<{ data?: { access_token?: string } }>(
              `${api.defaults.baseURL}/v1/refresh-token`,
              { refresh_token: rToken },
              { withCredentials: true }
            )
            .then((r) => {
              const newAccess = r.data?.data?.access_token
              return newAccess ?? null
            })
        }

        const newToken = await refreshPromise
        refreshPromise = null

        if (newToken) {
          await setToken(newToken)
          syncAuthToken(newToken)
          try {
            window.dispatchEvent(
              new CustomEvent('auth:token', { detail: { token: newToken } })
            )
          } catch { (() => {})() }
          original.headers?.set?.('access-token', newToken)
          return instance(original)
        }
      } catch {
        // fallthrough to logout below
      }

      await clearAuth()
      window.location.href = '/login'
      return Promise.reject(err)
    }
  )
}

// Configure the main Axios instance (monolith / CloudFront proxy)
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  withCredentials: true,
})

// Initialize default access-token header from encrypted storage (once at startup)
;(async function initAuthHeader() {
  try {
    const token = await getToken()
    if (token) api.defaults.headers.common['access-token'] = token
  } catch { (() => {})() }
})()

attachInterceptors(api)

export function syncAuthToken(token: string | null) {
  if (token) api.defaults.headers.common['access-token'] = token
  else delete api.defaults.headers.common['access-token']
}
