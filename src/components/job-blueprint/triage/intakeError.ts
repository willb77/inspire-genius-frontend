import type { TFunction } from "i18next"

// Callers without a `t` (a plain-function test) get the English default.
const englishOnly = ((_key: string, opts: { defaultValue: string }) => opts.defaultValue) as unknown as TFunction

/** FastAPI puts a string in `detail` on 4xx and a LIST on 422 — never toast the raw object. */
export function describeIntakeError(err: unknown, t: TFunction = englishOnly): string {
  const e = err as { response?: { status?: number; data?: { detail?: unknown } } } | undefined
  const status = e?.response?.status
  const detail = e?.response?.data?.detail
  // BP-F4: a 403 can now also mean "no organisation" or "below manager in the
  // organisation". Those say so in their own words; any other 403 is the
  // entitlement gate, which keeps its fixed sentence.
  if (status === 403) {
    if (typeof detail === "string" && /organisation|manager or above/i.test(detail)) return detail
    return t("intake.notEnabled", { defaultValue: "Your account is not enabled for Job DNA authoring, so it cannot add candidates." })
  }
  if (typeof detail === "string" && detail) return detail
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : ""))
      .filter(Boolean)
    if (msgs.length) return msgs.join("; ")
  }
  return t("intake.failed", { defaultValue: "Could not add the candidate. Please try again." })
}
