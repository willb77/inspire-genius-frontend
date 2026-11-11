import type { AxiosError } from "axios"

/** What a failed Favorites call says. The server's own sentence wins. */
export function savedJobErrorText(err: unknown): string {
  const e = err as AxiosError<{ detail?: unknown }> | undefined
  const status = e?.response?.status
  const detail = e?.response?.data?.detail
  if (typeof detail === "string" && detail) return detail
  if (status === 403) return "Favorites aren't available on your account right now."
  if (status === 404) return "That job isn't in your favorites."
  if (status === 409) return "Your favorites list is full. Remove one to save another."
  return "That didn't work. Please try again."
}
