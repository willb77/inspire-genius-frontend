/**
 * Turn any thrown API error into a string that is safe to render.
 *
 * ## The bug this exists to prevent
 *
 * FastAPI returns `detail` as a **string** for a raised `HTTPException`, but as
 * an **array of objects** for a 422 validation failure:
 *
 *     {"detail": [{"type": "string_type",
 *                  "loc": ["body", "evidence", "sd_score"],
 *                  "msg": "Input should be a valid string",
 *                  "input": 4}]}
 *
 * Four call sites read `response.data.detail` and passed it straight to
 * `toast.error(...)`. On a 422 that hands an array of objects to sonner, which
 * renders it as a React child — *"Objects are not valid as a React child"*,
 * React error #31, caught by the ErrorBoundary. **A failed save took the whole
 * page down.**
 *
 * The API call failing was a bug. The app dying because of it was a worse one,
 * and it is the one this file closes: every branch here returns a string.
 */

type ValidationItem = { msg?: unknown; loc?: unknown; type?: unknown }

function isValidationItem(v: unknown): v is ValidationItem {
  return typeof v === "object" && v !== null && "msg" in v
}

/** `["body", "evidence", "sd_score"]` → `evidence.sd_score` (the leading scope is noise). */
function fieldPath(loc: unknown): string {
  if (!Array.isArray(loc)) return ""
  return loc
    .filter((p) => p !== "body" && p !== "query" && p !== "path")
    .map(String)
    .join(".")
}

function fromValidationList(items: unknown[]): string {
  const parts = items.filter(isValidationItem).map((item) => {
    const where = fieldPath(item.loc)
    const msg = typeof item.msg === "string" ? item.msg : "is invalid"
    return where ? `${where}: ${msg}` : msg
  })
  // Bounded: a 422 can carry one entry per field, and a toast is not a log.
  if (parts.length > 3) {
    return `${parts.slice(0, 3).join("; ")} (and ${parts.length - 3} more)`
  }
  return parts.join("; ")
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail

  if (typeof detail === "string" && detail.trim()) return detail
  if (Array.isArray(detail)) {
    const text = fromValidationList(detail)
    if (text) return text
  }
  // An object that is not a validation list: readable, but never rendered raw.
  if (detail && typeof detail === "object") {
    if (isValidationItem(detail)) {
      const one = fromValidationList([detail])
      if (one) return one
    }
    return fallback
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export default apiErrorMessage
