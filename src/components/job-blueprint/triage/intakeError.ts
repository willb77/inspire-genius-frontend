/** FastAPI puts a string in `detail` on 4xx and a LIST on 422 — never toast the raw object. */
export function describeIntakeError(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { detail?: unknown } } } | undefined
  const status = e?.response?.status
  const detail = e?.response?.data?.detail
  if (status === 403) return "Your account is not enabled for Job DNA authoring, so it cannot add candidates."
  if (typeof detail === "string" && detail) return detail
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : ""))
      .filter(Boolean)
    if (msgs.length) return msgs.join("; ")
  }
  return "Could not add the candidate. Please try again."
}
