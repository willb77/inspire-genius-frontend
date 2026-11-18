import type { AxiosError } from "axios"
import type { TFunction } from "i18next"

/** CX-5 — the sentence a student sees for a refused or failed call. */
type ApiDetail = string | { code?: string; message?: string } | unknown[] | undefined

const CONFLICT_COPY: Record<string, string> = {
  version_conflict:
    "Your exercise changed since this page loaded (perhaps in another tab). It has been reloaded — try again.",
  invalid_transition: "That can't be done right now; your exercise has been reloaded.",
}
const FORBIDDEN_COPY = "The career exploration exercise isn't open on your account."
const NOT_FOUND_COPY = "That exercise could not be found. It has been reloaded."

/**
 * `t` is optional: without it the English above is returned (so callers that pass none are unchanged).
 * With it, our own sentences resolve from `careerExerciseUi`; the server's `message`/`detail` text
 * and the caller's `fallback` (already translated by the caller) pass through untouched.
 */
export function exerciseErrorMessage(err: unknown, fallback: string, t?: TFunction): string {
  const own = (key: string, en: string): string =>
    t ? t(`careerExerciseUi:studentError.${key}`, { defaultValue: en }) : en
  const e = err as AxiosError<{ detail?: ApiDetail }> | undefined
  const status = e?.response?.status
  const detail = e?.response?.data?.detail
  if (status === 409 && detail && typeof detail === "object" && !Array.isArray(detail)) {
    const d = detail as { code?: string; message?: string }
    return (d.code && CONFLICT_COPY[d.code] && own(d.code, CONFLICT_COPY[d.code])) || d.message || fallback
  }
  if (status === 403) return own("forbidden", FORBIDDEN_COPY)
  if (status === 404) return own("notFound", NOT_FOUND_COPY)
  if (typeof detail === "string" && detail.trim()) return detail
  return fallback
}
