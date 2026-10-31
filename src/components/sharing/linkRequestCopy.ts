/**
 * Link requests (MMLR-5 and MMLR-6): the fixed copy, the status wording, the
 * category labels and the error readers, shared by the member's card, the
 * manager's panel, the company-admin's section and their tests.
 */

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
export function categoryLabels(keys: readonly string[]): string[] {
  return LINK_REQUEST_CATEGORIES.filter((c) => keys.includes(c.key)).map((c) => c.label)
}

/**
 * What the member sees for a status. Their own actions read as themselves;
 * everything else — declined, cancelled, expired, removed, the server's
 * `closed`, and any status this card does not know — reads "Closed", with no
 * detail.
 */
export function memberStatusLabel(status: string): string {
  if (status === "pending") return "Waiting for a reply"
  if (status === "approved") return "Added"
  if (status === "withdrawn") return "Withdrawn"
  if (status === "left") return "Left the team"
  return "Closed"
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
export function adminRequestLine(memberName: string | null | undefined, managerName: string | null | undefined): string {
  const member = memberName?.trim() || "A member"
  const manager = managerName?.trim() ? `${managerName.trim()}'s team` : "a manager's team"
  return `${member} asked to join ${manager}`
}

/** A company-admin's cancel refusal, by its code; never a success. */
export function adminCancelErrorText(err: unknown): string {
  const status = statusOf(err)
  if (status === 403) return ADMIN_COPY.companyAdminOnly
  if (status === 409 && codeOf(err) === "not_pending") return ADMIN_COPY.notPending
  if (status === 404) return ADMIN_COPY.gone
  return ADMIN_COPY.failed
}

/** A short date, or "" when there is none. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}
