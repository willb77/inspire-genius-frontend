import type { AxiosError } from "axios"
import type { TFunction } from "i18next"

/** A failed target/roadmap call as a person can read it. FastAPI sends a
 * string `detail` for 4xx and a LIST on 422 — never render the object. */
/** `t` is optional so callers outside the translated surfaces keep their English. */
function tr(t: TFunction | undefined, key: string, en: string): string {
  return t ? t(key, { defaultValue: en }) : en
}

export function targetErrorText(err: unknown, t?: TFunction): string {
  const e = err as AxiosError<{ detail?: unknown }> | undefined
  const status = e?.response?.status
  const detail = e?.response?.data?.detail
  if (typeof detail === "string" && detail) return detail
  if (status === 403) return tr(t, "targets.error403", "Goal targets aren't available on your account right now.")
  if (status === 404) return tr(t, "targets.error404", "That role or goal couldn't be found.")
  if (status === 413) return tr(t, "targets.error413", "This fit is too large to save as a target.")
  return tr(t, "targets.errorDefault", "That didn't work. Please try again.")
}

/** A goal made by "Make this my target" is keyed on the role. */
export function isJobFitGoal(publishedFrom: string | null | undefined): boolean {
  return typeof publishedFrom === "string" && publishedFrom.startsWith("job-fit:")
}
