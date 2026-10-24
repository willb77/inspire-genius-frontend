import { apiErrorMessage } from "@/lib/apiErrorMessage"
import type { CurriculumReport } from "@/types/curriculum"

/**
 * Every refusal the curriculum API sends, as something the page can render.
 *
 * CUR-1 refuses in four shapes (routes/curriculum.py):
 *   - `detail: "text"` — 403 (role / switch), 404, 409 (not a draft), 422, 503
 *   - `detail: {message, report}` — a cycle or unknown code on a by-hand edit,
 *     a refused real import, a refused publish
 *   - `detail: {message, errors: [...]}` — a course/program field check
 *   - `detail: {message, referencedBy: [...]}` — deleting a course still required
 * plus FastAPI's own validation list on a malformed body.
 *
 * `apiErrorMessage` alone returns its FALLBACK for an object detail, which
 * would hide the cycle chain or the outstanding list behind "Something went
 * wrong" — so the object shapes are read here first.
 */
export type CurriculumError = {
  status: number | null
  message: string
  report: CurriculumReport | null
  /** Field-check errors, or what still references a course, one per line. */
  items: string[]
}

type ErrorLike = { response?: { status?: number; data?: { detail?: unknown } } }

function isReport(v: unknown): v is CurriculumReport {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as CurriculumReport).ok === "boolean" &&
    Array.isArray((v as CurriculumReport).cycles)
  )
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

export function curriculumError(err: unknown, fallback: string): CurriculumError {
  const response = (err as ErrorLike)?.response
  const status = typeof response?.status === "number" ? response.status : null
  const detail = response?.data?.detail
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const d = detail as { message?: unknown; report?: unknown; errors?: unknown; referencedBy?: unknown }
    const message = typeof d.message === "string" && d.message.trim() ? d.message : fallback
    return {
      status,
      message,
      report: isReport(d.report) ? d.report : null,
      items: [...strings(d.errors), ...strings(d.referencedBy)],
    }
  }
  return { status, message: apiErrorMessage(err, fallback), report: null, items: [] }
}

/** The HTTP status of a failed call, or null for a network error. */
export function errorStatus(err: unknown): number | null {
  const s = (err as ErrorLike)?.response?.status
  return typeof s === "number" ? s : null
}
