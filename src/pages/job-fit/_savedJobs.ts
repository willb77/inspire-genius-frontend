import type { AxiosError } from "axios"
import type { TFunction } from "i18next"

/** What a failed Favorites call says. The server's own sentence wins. */
export function savedJobErrorText(err: unknown, t: TFunction): string {
  const e = err as AxiosError<{ detail?: unknown }> | undefined
  const status = e?.response?.status
  const detail = e?.response?.data?.detail
  if (typeof detail === "string" && detail) return detail
  if (status === 403) return t("savedJobs.error403", "Favorites aren't available on your account right now.")
  if (status === 404) return t("savedJobs.error404", "That job isn't in your favorites.")
  if (status === 409) return t("savedJobs.error409", "Your favorites list is full. Remove one to save another.")
  return t("savedJobs.errorGeneric", "That didn't work. Please try again.")
}
