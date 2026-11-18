/**
 * Link requests (MMLR-5 and MMLR-6): the fixed copy, the status wording, the
 * category labels and the error readers, shared by the member's card, the
 * manager's panel, the company-admin's section and their tests.
 *
 * Translation: these are module-level, so nothing here calls t() at import.
 * The exported constants stay the English text and double as the i18next
 * `defaultValue`; each is registered under a key in LINK_COPY_DEFAULTS and the
 * functions that build text take the caller's `t` and resolve at render time.
 * Without a `t` they return the English, as before. The keys live in
 * public/locales/en/sharingUi.json.
 */

export const SHARING_UI_NS = "sharingUi"

/** The shape of i18next's `t` this file needs (the real one is assignable). */
export type CopyTranslate = (key: string, options: { defaultValue: string; [k: string]: unknown }) => unknown

/** Resolve `key` with its English default; interpolates {{vars}} itself when no `t` is given. */
function say(t: CopyTranslate | undefined, key: LinkCopyKey, vars?: Record<string, string>): string {
  const defaultValue = LINK_COPY_DEFAULTS[key]
  if (t) {
    const out = t(key, { defaultValue, ...vars })
    return typeof out === "string" ? out : defaultValue
  }
  return defaultValue.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => vars?.[k] ?? "")
}

/** Translated label for one of LINK_REQUEST_CATEGORIES. */
export function categoryLabel(c: (typeof LINK_REQUEST_CATEGORIES)[number], t?: CopyTranslate): string {
  return say(t, `categories.${c.key}`)
}

export const SENT_MESSAGE = "Sent. If that person can accept requests, they'll see it."
export const NO_SHARE_FOUND = "We couldn't find a share to stop — check the list above."
export const REFRESH_FAILED = "We couldn't refresh your requests just now."

/** The categories a member may offer, with the labels the sharing panel uses. */
export const LINK_REQUEST_CATEGORIES = [
  { key: "goals", label: "Goals" },
  { key: "prism", label: "PRISM profile" },
  { key: "assessments", label: "Assessments" },
  { key: "artefacts", label: "Profile" },
  { key: "interviews", label: "Interviews" },
  { key: "development", label: "Development" },
] as const

/** The labels for a request's ticked categories, in the panel's order; unknown keys are left out. */
export function categoryLabels(keys: readonly string[], t?: CopyTranslate): string[] {
  return LINK_REQUEST_CATEGORIES.filter((c) => keys.includes(c.key)).map((c) => categoryLabel(c, t))
}

/**
 * What the member sees for a status. Their own actions read as themselves;
 * everything else — declined, cancelled, expired, removed, the server's
 * `closed`, and any status this card does not know — reads "Closed", with no
 * detail.
 */
export function memberStatusLabel(status: string, t?: CopyTranslate): string {
  if (status === "pending") return say(t, "status.pending")
  if (status === "approved") return say(t, "status.approved")
  if (status === "withdrawn") return say(t, "status.withdrawn")
  if (status === "left") return say(t, "status.left")
  return say(t, "status.closed")
}

type ErrorShape = { response?: { status?: number; data?: { detail?: unknown } } }

/** The HTTP status of a failed call, if it reached the server. */
export function statusOf(err: unknown): number | undefined {
  return (err as ErrorShape | null | undefined)?.response?.status
}

/** The server's refusal code (`detail.code`); a 422's list-shaped detail has none. */
export function codeOf(err: unknown): string | undefined {
  const detail = (err as ErrorShape | null | undefined)?.response?.data?.detail
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const code = (detail as { code?: unknown }).code
    return typeof code === "string" ? code : undefined
  }
  return undefined
}

// ── MMLR-6: the company-admin's section (the manager's copy is in DEV_TEXT) ──

export const ADMIN_COPY = {
  title: "Requests to join a team",
  intro: "Members in your organisation who have asked a manager to add them to a team. You can cancel a request; the manager decides the rest.",
  refreshFailed: "We couldn't refresh requests just now.",
  cancel: "Cancel request",
  confirm: "Yes, cancel it",
  keep: "Keep",
  cancelled: "Request cancelled.",
  companyAdminOnly: "Only a company admin can cancel requests.",
  gone: "This request is no longer available.",
  notPending: "This request has already closed.",
  failed: "That didn't work. Nothing changed — try again.",
} as const

/** "{member} asked to join {manager}'s team", or "a manager's team" when growth sends no name. */
export function adminRequestLine(
  memberName: string | null | undefined,
  managerName: string | null | undefined,
  t?: CopyTranslate,
): string {
  const member = memberName?.trim() || say(t, "admin.aMember")
  const named = managerName?.trim()
  const manager = named ? say(t, "admin.theirTeam", { name: named }) : say(t, "admin.aManagersTeam")
  return say(t, "admin.requestLine", { member, manager })
}

/** A company-admin's cancel refusal, by its code; never a success. */
export function adminCancelErrorText(err: unknown, t?: CopyTranslate): string {
  const status = statusOf(err)
  if (status === 403) return say(t, "admin.companyAdminOnly")
  if (status === 409 && codeOf(err) === "not_pending") return say(t, "admin.notPending")
  if (status === 404) return say(t, "admin.gone")
  return say(t, "admin.failed")
}

/** Translated ADMIN_COPY entry. */
export function adminCopy(key: keyof typeof ADMIN_COPY, t?: CopyTranslate): string {
  return say(t, `admin.${key}`)
}

/** Translated SENT_MESSAGE / NO_SHARE_FOUND / REFRESH_FAILED. */
export function fixedCopy(key: "sentMessage" | "noShareFound" | "refreshFailed", t?: CopyTranslate): string {
  return say(t, key)
}

/**
 * Every string above, by i18next key, in English. The English file
 * (public/locales/en/sharingUi.json) must equal this exactly; the test checks
 * both directions. The two admin.* line pieces are templates, not constants.
 */
export const LINK_COPY_DEFAULTS = {
  sentMessage: SENT_MESSAGE,
  noShareFound: NO_SHARE_FOUND,
  refreshFailed: REFRESH_FAILED,
  ...Object.fromEntries(LINK_REQUEST_CATEGORIES.map((c) => [`categories.${c.key}`, c.label])),
  "status.pending": "Waiting for a reply",
  "status.approved": "Added",
  "status.withdrawn": "Withdrawn",
  "status.left": "Left the team",
  "status.closed": "Closed",
  ...Object.fromEntries(Object.entries(ADMIN_COPY).map(([k, v]) => [`admin.${k}`, v])),
  "admin.requestLine": "{{member}} asked to join {{manager}}",
  "admin.aMember": "A member",
  "admin.theirTeam": "{{name}}'s team",
  "admin.aManagersTeam": "a manager's team",
} as Record<string, string>

export type LinkCopyKey = string

/** A short date, or "" when there is none. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}
