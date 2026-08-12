import axios, { type AxiosInstance, type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { getToken, getRefreshToken, setToken, clearAuth } from '@/lib/storage'

// single-flight refresh and per-request retry guard
let refreshPromise: Promise<string | null> | null = null

/**
 * Marker set on a request config once we have refreshed and retried it.
 *
 * It is a PROPERTY ON THE CONFIG, not an external Set keyed by object
 * identity, and that distinction is the whole point.
 *
 * 2026-08-12: the guard here was `new WeakSet<InternalAxiosRequestConfig>()`
 * holding the `err.config` object. But the retry is issued as
 * `instance(original)`, and axios runs `mergeConfig` on the way in — so the
 * second failure arrives with a BRAND NEW config object the WeakSet has never
 * seen. The guard could never trip, and a persistently-401ing endpoint became
 * an unbounded loop: 401 → refresh → retry → 401 → refresh → …
 *
 * Measured on staging-b: one user, 132 `/v1/refresh-token` calls in 7 minutes,
 * ~2.5/second, and no logout — the loop just ran until the page changed.
 * Verified against axios 1.11.0: config identity is NOT preserved across a
 * retry, but a custom property IS carried through mergeConfig.
 */
const RETRY_FLAG = '__igAuthRetried' as const

type RetryableConfig = InternalAxiosRequestConfig & { [RETRY_FLAG]?: boolean }

function hasAlreadyRetried(config: RetryableConfig): boolean {
  return config[RETRY_FLAG] === true
}

function markRetried(config: RetryableConfig): void {
  config[RETRY_FLAG] = true
}

/**
 * Side-panel / read-only telemetry surfaces whose 401s must NOT cascade
 * into the global refresh/logout flow. If the user is browsing the chat
 * and one of these services hiccups (typical: misconfigured SECRET_KEY
 * env var, transient cold-start, service outage), the only outcome
 * should be the panel showing its own empty/error state — never a
 * forced logout that wipes the in-flight session.
 *
 * 2026-06-06: observability-query Lambda was missing SECRET_KEY → 401
 * on every panel open → interceptor refresh+retry → 2nd 401 → hard
 * redirect to /login. From the user's POV, clicking "Observability"
 * crashed the app and ate the chat.
 *
 * Match by url substring (regex/prefix overkill here — axios `config.url`
 * is the path the caller passed, not the resolved absolute URL).
 *
 * 2026-08-12: broadcast-service `/v1/notifications` 401'd every password-login
 * session (Cognito access tokens carry no `email` claim). The notification
 * bell polls on every page, so this drove the refresh loop described above.
 * The backend no longer 401s there, but the bell is exactly the class of
 * passive side-panel that must never be able to end a session — so it is
 * listed here too. Defence in depth: the backend fix stops it happening, this
 * stops it mattering.
 */
const NON_CRITICAL_401_PATHS = [
  '/v1/observability/',
  '/v1/analytics/',
  '/v1/dashboards/',
  '/v1/notifications',
] as const

function isNonCriticalPath(url: string | undefined): boolean {
  if (!url) return false
  return NON_CRITICAL_401_PATHS.some((p) => url.includes(p))
}

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
      const original = err.config as RetryableConfig | undefined
      if (!response || !original) return Promise.reject(err)

      if (response.status !== 401) return Promise.reject(err)

      // Non-critical telemetry surfaces (observability, analytics, dashboards):
      // a 401 here MUST NOT trigger refresh/logout. Let the caller's React
      // Query (or equivalent) flag isError and render its own empty/error
      // state. Keeps the user logged in when a side panel hiccups.
      if (isNonCriticalPath(original.url)) {
        return Promise.reject(err)
      }

      // Prevent retry loops per request. The flag rides ON the config so it
      // survives the mergeConfig that `instance(original)` performs — an
      // external Set keyed on object identity does not. See RETRY_FLAG.
      if (hasAlreadyRetried(original)) {
        await clearAuth()
        window.location.href = '/login'
        return Promise.reject(err)
      }
      markRetried(original)

      const rToken = await getRefreshToken()
      if (!rToken) {
        await clearAuth()
        window.location.href = '/login'
        return Promise.reject(err)
      }

      try {
        if (!refreshPromise) {
          // Cleared in a `finally` on the promise itself, not after the
          // `await` below: if the refresh REJECTS, the awaiting branch jumps
          // straight to catch/logout and a post-await assignment never runs,
          // leaving a permanently-rejected promise latched here. Every later
          // 401 would then reject instantly and force a logout.
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
            .finally(() => {
              refreshPromise = null
            })
        }

        const newToken = await refreshPromise

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
