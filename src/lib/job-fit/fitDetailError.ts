import type { AxiosError } from "axios"

/**
 * NP1 (N2-a): why `GET /v1/blueprint/fit/{jobId}` answered 404.
 *
 * The server sends `detail: { code: "no_prism" | "not_found", message }`.
 * `not_found` deliberately covers a missing, unpublished or another
 * organization's job alike, so it never reveals which. Anything else — an older
 * server's string detail, another status, a network error — is `null`, and the
 * page keeps today's "try again" text.
 */
export type FitDetailErrorCode = "no_prism" | "not_found"

export function fitDetailErrorCode(error: unknown): FitDetailErrorCode | null {
  const response = (error as AxiosError | null | undefined)?.response
  if (response?.status !== 404) return null
  const detail = (response.data as { detail?: unknown } | undefined)?.detail
  const code = detail && typeof detail === "object" ? (detail as { code?: unknown }).code : undefined
  return code === "no_prism" || code === "not_found" ? code : null
}

/** A 4xx is an answer, not a blip: retrying it only delays the honest state. */
export function isClientError(error: unknown): boolean {
  const status = (error as AxiosError | null | undefined)?.response?.status
  return typeof status === "number" && status >= 400 && status < 500
}

/** What a `QueryClient` may hold as its default `retry`. */
export type RetryDefault = boolean | number | ((failureCount: number, error: unknown) => boolean) | undefined

/** React Query's own default when a client sets none. */
const LIBRARY_DEFAULT_RETRIES = 3

/**
 * A `retry` that never retries a 4xx and otherwise does exactly what the
 * client's own default says (the app's `retry: 2`; a test client's `false`), so
 * nothing but the 4xx case changes.
 */
export function retryUnlessClientError(fallback: RetryDefault) {
  return (failureCount: number, error: unknown): boolean => {
    if (isClientError(error)) return false
    if (typeof fallback === "function") return fallback(failureCount, error)
    if (typeof fallback === "number") return failureCount < fallback
    // React Query: `true` retries without limit, `false` never.
    if (typeof fallback === "boolean") return fallback
    return failureCount < LIBRARY_DEFAULT_RETRIES
  }
}
