import type { AxiosError } from "axios"

/** CX-5 — the sentence a student sees for a refused or failed call. */
type ApiDetail = string | { code?: string; message?: string } | unknown[] | undefined

const CONFLICT_COPY: Record<string, string> = {
  version_conflict:
    "Your exercise changed since this page loaded (perhaps in another tab). It has been reloaded — try again.",
  invalid_transition: "That can't be done right now; your exercise has been reloaded.",
}

export function exerciseErrorMessage(err: unknown, fallback: string): string {
  const e = err as AxiosError<{ detail?: ApiDetail }> | undefined
  const status = e?.response?.status
  const detail = e?.response?.data?.detail
  if (status === 409 && detail && typeof detail === "object" && !Array.isArray(detail)) {
    const d = detail as { code?: string; message?: string }
    return (d.code && CONFLICT_COPY[d.code]) || d.message || fallback
  }
  if (status === 403) return "The career exploration exercise isn't open on your account."
  if (status === 404) return "That exercise could not be found. It has been reloaded."
  if (typeof detail === "string" && detail.trim()) return detail
  return fallback
}
