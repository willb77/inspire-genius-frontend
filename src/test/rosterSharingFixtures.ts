/**
 * U6c — roster rows in the shape growth-service sends them (`GET /v1/growth/roster`,
 * camelCase, `RosterMember` + `RosterSharing` from TDS-U6b), as parsed JSON.
 *
 * Every row starts with NO gated field on it (no PRISM / Clifton / DISC tick, no
 * headline, no top match), so a test can add exactly the field it is about.
 * Names are invented.
 */
import type { RosterMember } from "@/types/development"

export type SharingCase = {
  /** What the person reads on the chip. */
  label: string
  /** The `data-sharing` value on the chip. */
  display: string
  /** True when the chip claims something is NOT shared. */
  claimsAbsence: boolean
  /** The JSON body of one roster row, as the server sends it. */
  json: string
  /** Whether the grant read worked for the roster this row came in. */
  readWorked: boolean
}

function row(sharing: string, identityResolved: string): string {
  return `{
    "memberId": "mbr-0001",
    "name": "Quinn Halvorsen",
    "title": "Analyst",
    "department": "Operations",
    "avatarUrl": null,
    "coverage": {"prism": false, "clifton": false, "disc": false},
    "reconciledHeadline": null,
    "headlineConfidence": null,
    "planStatus": "no_plan",
    "milestoneProgress": null,
    "topMatch": null,
    "identityResolved": ${identityResolved},
    "sharing": ${sharing}
  }`
}

const block = (state: string, cats: string[] = [], canRequest = false) =>
  JSON.stringify({
    state,
    grantedCategories: cats,
    expiresAt: state === "granted" ? "2027-05-01T00:00:00+00:00" : null,
    requestedAt: state === "none" ? null : "2026-11-01T12:00:00+00:00",
    canRequest,
  })

/** The eight states, each from the response shape that produces it. */
export const SHARING_CASES: SharingCase[] = [
  { label: "Not asked", display: "not_asked", claimsAbsence: true, json: row(block("none", [], true), "true"), readWorked: true },
  { label: "Awaiting reply", display: "awaiting", claimsAbsence: true, json: row(block("pending"), "true"), readWorked: true },
  {
    label: "Shared: PRISM, Goals, Interviews, Development",
    display: "shared",
    claimsAbsence: false,
    json: row(block("granted", ["prism", "goals", "interviews", "development"]), "true"),
    readWorked: true,
  },
  { label: "Declined", display: "declined", claimsAbsence: true, json: row(block("declined", [], true), "true"), readWorked: true },
  { label: "Withdrawn", display: "withdrawn", claimsAbsence: true, json: row(block("revoked", [], true), "true"), readWorked: true },
  { label: "Term ended", display: "term_ended", claimsAbsence: true, json: row(block("expired", [], true), "true"), readWorked: true },
  // A minted Studio-added id: the server sends `sharing: null` and identityResolved false.
  { label: "No account", display: "no_account", claimsAbsence: false, json: row("null", "false"), readWorked: true },
  // null for an account: the read failed, or the row's status is unknown, or it is the caller's own card.
  { label: "Not known", display: "not_known", claimsAbsence: false, json: row("null", "true"), readWorked: true },
]

/** Extra null shapes that must all read "Not known", never "Not asked" / "nothing shared". */
export const NOT_KNOWN_SHAPES: Array<{ why: string; json: string; readWorked: boolean }> = [
  { why: "identity unknown (no organisation resolved)", json: row("null", "null"), readWorked: true },
  { why: "the grant read failed for the whole roster, minted id", json: row("null", "false"), readWorked: false },
  { why: "the grant read failed for the whole roster, account", json: row("null", "true"), readWorked: false },
  { why: "an older backend that sends neither field", json: `{"memberId":"mbr-0002","name":"Rowan Achterberg","coverage":{"prism":false,"clifton":false,"disc":false},"planStatus":"no_plan"}`, readWorked: false },
  { why: "a state this build does not know", json: row(JSON.stringify({ state: "suspended", grantedCategories: [], canRequest: false }), "true"), readWorked: true },
  { why: "granted with nothing live named", json: row(block("granted", []), "true"), readWorked: true },
]

export function parse(json: string): RosterMember {
  return JSON.parse(json) as RosterMember
}

/**
 * U6d shape (growth-service, `tds_roster_consent_gate` on for the caller's org):
 * `withheld` lists the categories withheld from this caller; `prism` nulls the
 * headline and its confidence, `development` nulls plan status and milestone
 * progress, either nulls the top match. The PRISM tick is kept (D12a), and
 * identity fields and `sharing` are never withheld. Stored values the server
 * WOULD have sent are below, so a test can assert none of them renders.
 */
export const U6D_STORED = {
  headline: "Measured organiser who checks the brief twice.",
  topMatch: "Logistics Coordinator",
}

export function u6dRow(withheld: string[], sharing: string): string {
  const prism = withheld.includes("prism")
  const dev = withheld.includes("development")
  return JSON.stringify({
    memberId: "mbr-0101",
    name: "Ines Varga",
    title: "Coordinator",
    department: "Operations",
    avatarUrl: null,
    coverage: { prism: true, clifton: false, disc: false, prismAssessedAt: "2026-06-01T00:00:00+00:00" },
    reconciledHeadline: prism ? null : U6D_STORED.headline,
    headlineConfidence: prism ? null : "moderate",
    planStatus: dev ? null : "active",
    milestoneProgress: dev ? null : 40,
    topMatch: prism || dev ? null : { title: U6D_STORED.topMatch, fitScore: 71 },
    identityResolved: true,
    sharing: JSON.parse(sharing),
    withheld,
  })
}
