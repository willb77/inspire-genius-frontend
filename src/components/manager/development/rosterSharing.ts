/**
 * TDS U6c — the roster card's sharing chip, as pure functions.
 *
 * The server is the only source. `sharing` comes from growth-service
 * (`_apply_sharing`, TDS-U6b), which already applies the liveness rule: a
 * granted row that was revoked or ran out is reported as `revoked` / `expired`,
 * and `grantedCategories` holds only categories that are live at read time.
 * Nothing here looks at a date or re-derives a state. It maps the server's
 * answer to words, and decides whether those words may be shown on a card.
 *
 * Eight states a person reads:
 *
 *   server `sharing`                                  shown
 *   ------------------------------------------------- -------------------------
 *   { state: "none" }                                 Not asked
 *   { state: "pending" }                              Awaiting reply
 *   { state: "granted", grantedCategories: [...] }    Shared: <what, labelled>
 *   { state: "declined" }                             Declined
 *   { state: "revoked" }                              Withdrawn
 *   { state: "expired" }                              Term ended
 *   null, identityResolved === false, read worked     No account
 *   null otherwise (or absent: an older backend)      Not known
 *
 * `null` is NEVER "nothing shared". The server sends `null` when it could not
 * read the grants, when the card is the caller's own, when a row's status is
 * one it does not know, and when the id is not known to name an account. The
 * last is "No account" only when the server also says the id is a minted
 * roster-local one (`identityResolved === false`) AND the grant read itself
 * worked for this roster — a failed read nulls every card, and a cross-org
 * direct report (also `identityResolved === false`) would then read "No
 * account" while having one.
 */
import type { FrameworkCoverage, RosterMember, RosterSharingState } from "@/types/development"

export type SharingDisplay =
  | "not_asked"
  | "awaiting"
  | "shared"
  | "declined"
  | "withdrawn"
  | "term_ended"
  | "no_account"
  | "not_known"

/** Display order for the filter. */
export const SHARING_DISPLAYS: readonly SharingDisplay[] = [
  "shared",
  "not_asked",
  "awaiting",
  "declined",
  "withdrawn",
  "term_ended",
  "no_account",
  "not_known",
]

const FROM_SERVER: Record<RosterSharingState, SharingDisplay> = {
  none: "not_asked",
  pending: "awaiting",
  granted: "shared",
  declined: "declined",
  revoked: "withdrawn",
  expired: "term_ended",
}

/**
 * True when at least one card carries a sharing block, i.e. the server's grant
 * read worked for this roster. An older backend, or a failed read, sends none.
 */
export function sharingReadWorked(roster: readonly RosterMember[] | undefined): boolean {
  return (roster ?? []).some((m) => m.sharing != null)
}

export function sharingDisplay(member: RosterMember, readWorked: boolean): SharingDisplay {
  const s = member.sharing
  if (s == null) {
    return readWorked && member.identityResolved === false ? "no_account" : "not_known"
  }
  const mapped = Object.prototype.hasOwnProperty.call(FROM_SERVER, s.state)
    ? FROM_SERVER[s.state]
    : undefined
  if (!mapped) return "not_known"
  // The server sends `granted` only with at least one live category. If it ever
  // did not, "Shared" with nothing named would be a claim nobody can check.
  if (mapped === "shared" && (s.grantedCategories ?? []).length === 0) return "not_known"
  return mapped
}

/**
 * Every category the server can grant (agent-engine `app/consent/`, eight of
 * them; `safety` is never grantable). `interviews` and `development` print as
 * the raw key on Member Oversight; here they have words.
 */
export const SHARING_CATEGORY_KEYS = [
  "prism",
  "engagement",
  "topics",
  "artefacts",
  "goals",
  "assessments",
  "interviews",
  "development",
] as const
export type SharingCategoryKey = (typeof SHARING_CATEGORY_KEYS)[number]

export function isKnownCategory(key: string): key is SharingCategoryKey {
  return (SHARING_CATEGORY_KEYS as readonly string[]).includes(key)
}

/**
 * The fields on a roster card that a sharing category governs, and which
 * categories each needs. The server sends these whether or not the person
 * shares them until U6d (behind a server switch, off by default) stops it.
 */
export type GatedField = "prismTick" | "cliftonTick" | "discTick" | "headline" | "plan" | "topMatch"

const NEEDS: Record<GatedField, readonly SharingCategoryKey[]> = {
  // Plan status and milestone progress come from milestones, which the person
  // page blanks under `development` (U6d CSA, P3).
  plan: ["development"],
  prismTick: ["prism"],
  // CliftonStrengths and DISC are not PRISM; the nearest grantable category is
  // `assessments`. Counting them can only hide a chip, never show one.
  cliftonTick: ["assessments"],
  discTick: ["assessments"],
  // Aura's reconciled headline is written from the PRISM profile.
  headline: ["prism"],
  // Career matches need both PRISM and development (item 2 / A2).
  topMatch: ["prism", "development"],
}

/** Which gated fields this card will render. `topMatchShown` is the card's own answer. */
export function gatedFieldsShown(
  coverage: FrameworkCoverage,
  headline: string | undefined | null,
  topMatchShown: boolean,
): GatedField[] {
  const out: GatedField[] = []
  if (coverage.prism) out.push("prismTick")
  if (coverage.clifton) out.push("cliftonTick")
  if (coverage.disc) out.push("discTick")
  if (headline) out.push("headline")
  if (topMatchShown) out.push("topMatch")
  return out
}

/**
 * U6d: the categories the server withheld on this card, or `null` when it
 * sent no `withheld` list (older backend, or `tds_roster_consent_gate` off for
 * this org). Only the server's list says a field was withheld; nothing here
 * infers it from `sharing`, because a live grant does not prove the page rule
 * lets this caller see it (a whole-organisation caller with no relationship is
 * withheld despite the grant).
 */
export function withheldCategories(member: RosterMember): ReadonlySet<string> | null {
  return Array.isArray(member.withheld) ? new Set(member.withheld) : null
}

/**
 * The gated fields this card will render, in either mode.
 *
 * - `withheld` absent/null (gate not applied): the U6c fallback. The server
 *   sent everything, so the PRISM / Clifton / DISC ticks, headline and top
 *   match are counted as before. The plan is not counted: the server always
 *   sends it in this mode, and it was never part of the task-4 list.
 * - `withheld` present (gate applied): exactly what the server still sent:
 *   headline, plan (status or milestone progress) and top match. The ticks
 *   are not gated here: the server keeps `coverage` on purpose (D12a, as the
 *   person page does) because whether a PRISM exists is not the secret.
 */
export function cardGatedFields(member: RosterMember, topMatchShown: boolean): GatedField[] {
  if (withheldCategories(member) === null) {
    return gatedFieldsShown(member.coverage, member.reconciledHeadline, topMatchShown)
  }
  const out: GatedField[] = []
  if (member.reconciledHeadline) out.push("headline")
  if (member.planStatus != null || typeof member.milestoneProgress === "number") out.push("plan")
  if (topMatchShown) out.push("topMatch")
  return out
}

/**
 * The task-4 rule. A chip that says, or implies, that the person does not
 * share something must never sit beside a field that something governs.
 *
 * Claims of absence: Not asked, Awaiting reply, Declined, Withdrawn, Term
 * ended — nothing is shared — and "Shared: X" when a shown field needs a
 * category X does not include. "No account" and "Not known" claim nothing
 * about sharing, so they never contradict a field.
 *
 * When the chip WOULD contradict, the card is shown as it is today and the
 * chip is left off. The data is not hidden: hiding server data in the browser
 * is not a consent mechanism, and U6d is where the server stops sending it.
 */
export function chipContradictsCard(
  display: SharingDisplay,
  grantedCategories: readonly string[],
  shown: readonly GatedField[],
): boolean {
  if (display === "no_account" || display === "not_known") return false
  const live = display === "shared" ? new Set(grantedCategories) : new Set<string>()
  return shown.some((f) => NEEDS[f].some((c) => !live.has(c)))
}
