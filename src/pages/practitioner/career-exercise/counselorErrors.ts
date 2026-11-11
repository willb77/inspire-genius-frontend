import type { AxiosError } from "axios"

/** CX-6 — the sentence a counselor sees for a refused or failed call. A 409
 * carries a code; anything else prefers the server's own sentence. */
type ApiDetail = string | { code?: string; message?: string } | undefined

function detailOf(err: unknown): { status?: number; detail: ApiDetail } {
  const e = err as AxiosError<{ detail?: ApiDetail }> | undefined
  return { status: e?.response?.status, detail: e?.response?.data?.detail }
}

const CONFLICT_COPY: Record<string, string> = {
  version_conflict:
    "The student's exercise moved on since you opened it. It has been reloaded — check the paths again before confirming.",
  no_paths: "The student has not chosen a Primary and Backup Path yet.",
  stage_not_reached: "The student has not reached this step yet.",
  too_many_annotations: "This session has reached its limit of notes.",
}

export function counselorErrorMessage(err: unknown, fallback: string): string {
  const { status, detail } = detailOf(err)
  if (status === 409 && detail && typeof detail === "object") {
    return (detail.code && CONFLICT_COPY[detail.code]) || detail.message || fallback
  }
  if (typeof detail === "string" && detail.trim()) return detail
  if (status === 403) return "You cannot see this student's career exercise."
  return fallback
}

