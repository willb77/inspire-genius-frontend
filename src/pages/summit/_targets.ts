import type { AxiosError } from "axios"

/** A failed target/roadmap call as a person can read it. FastAPI sends a
 * string `detail` for 4xx and a LIST on 422 — never render the object. */
export function targetErrorText(err: unknown): string {
  const e = err as AxiosError<{ detail?: unknown }> | undefined
  const status = e?.response?.status
  const detail = e?.response?.data?.detail
  if (typeof detail === "string" && detail) return detail
  if (status === 403) return "Goal targets aren't available on your account right now."
  if (status === 404) return "That role or goal couldn't be found."
  if (status === 413) return "This fit is too large to save as a target."
  return "That didn't work. Please try again."
}

/** A goal made by "Make this my target" is keyed on the role. */
export function isJobFitGoal(publishedFrom: string | null | undefined): boolean {
  return typeof publishedFrom === "string" && publishedFrom.startsWith("job-fit:")
}
