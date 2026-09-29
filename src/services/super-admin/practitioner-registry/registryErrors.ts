import { apiErrorMessage } from "@/lib/apiErrorMessage"
import type { RegistryError } from "@/types/practitioner-registry"

function isRegistryError(v: unknown): v is RegistryError {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as RegistryError).field === "string" &&
    typeof (v as RegistryError).message === "string"
  )
}

/**
 * The registry routes refuse with `detail` as a LIST of `{row, field, message}`
 * — every problem at once. Returns that list, or `[]` when the error is any
 * other shape (network, 403, FastAPI's own `{loc, msg}` list).
 */
export function registryErrors(err: unknown): RegistryError[] {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return Array.isArray(detail) ? detail.filter(isRegistryError) : []
}

/** `row 3 · site_id: is required` — always a string, safe to render or toast. */
export function formatRegistryError(e: RegistryError): string {
  return e.row == null ? `${e.field}: ${e.message}` : `row ${e.row} · ${e.field}: ${e.message}`
}

/** One line for a toast: the registry list when there is one, else apiErrorMessage. */
export function registryErrorSummary(err: unknown, fallback: string): string {
  const list = registryErrors(err)
  if (list.length === 0) return apiErrorMessage(err, fallback)
  const head = list.slice(0, 3).map(formatRegistryError).join("; ")
  return list.length > 3 ? `${head} (and ${list.length - 3} more)` : head
}
