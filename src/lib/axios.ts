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

/**
 * Check whether the monolith backend is enabled as the primary API target.
 * When disabled (default), `api` routes through API Gateway which dispatches
 * to microservice Lambdas or the Agent Engine.
 * When enabled, `api` routes through CloudFront → monolith (legacy backup).
 *
 * Toggle: localStorage.setItem('monolith_enabled', 'true') to re-enable.
 */
function isMonolithEnabled(): boolean {
  try {
    return localStorage.getItem('monolith_enabled') === 'true'
  } catch {
    return false
  }
}

/**
 * Resolve the base URL for the main `api` axios instance.
 *
 * Priority:
 *   1. If monolith_enabled=true → VITE_API_BASE_URL (CloudFront → monolith)
 *   2. Otherwise → VITE_AGENT_ENGINE_URL (API Gateway → microservices)
 *   3. Fallback → VITE_API_BASE_URL → localhost:3000
 *
 * The API Gateway (VITE_AGENT_ENGINE_URL) routes every /v1/* path:
 *   - /v1/agents/*     → Agent Engine ALB
 *   - /v1/auth/*       → auth-service Lambda
 *   - /v1/documents/*  → document-service Lambda
 *   - /v1/audit/*      → audit-service Lambda
 *   - /v1/*            → monolith ALB (Strangler Fig catch-all)
 *
 * This means ALL existing service calls keep working — the API Gateway
 * catch-all forwards unmatched paths to the monolith automatically.
 */
function resolveApiBaseUrl(): string {
  if (isMonolithEnabled()) {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  }
  // Route through API Gateway (Agent Engine URL) — monolith is still
  // reachable via the catch-all /v1/{proxy+} route when needed.
  return (
    import.meta.env.VITE_AGENT_ENGINE_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:3000'
  )
}

// Configure the main Axios instance.
// Default: routes through API Gateway (microservices-first).
// Backup: set localStorage monolith_enabled=true to route through CloudFront → monolith.
export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
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

/** The monolith base URL — available for any code that explicitly needs the monolith. */
export const monolithBaseUrl: string =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

/** Re-evaluate the api baseURL after a toggle change (call from settings UI). */
export function refreshApiBaseUrl(): void {
  api.defaults.baseURL = resolveApiBaseUrl()
}
