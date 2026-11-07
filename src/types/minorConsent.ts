/**
 * N-2: under-18 support (agent-engine `minor_consent`, default off, per org).
 * The server decides; these types only carry its answer to the page.
 */

/** The surfaces the minor gate covers. Mirrors `app.minors.policy.SURFACES`. */
export type MinorGateSurface = "chat" | "prism" | "role_play" | "verticals" | "documents"

export type MinorGateDecision = {
  allowed: boolean
  reason: string
  /** The server's honest message for a refusal; null when allowed. */
  message: string | null
}

export type MinorConsentStatus = {
  /** True only when the switch applies to the caller's organisation. */
  enabled: boolean
  /** Whether this caller's import may record roster dates of birth. */
  rosterAgeCapture: boolean
  /** Present only when `enabled`. */
  surfaces?: Partial<Record<MinorGateSurface, MinorGateDecision>>
}

export type RosterAgeRow = {
  email: string
  dateOfBirth: string
  organizationId?: string
}

export type RosterAgeOutcome = "recorded" | "invalid_date" | "not_permitted" | "not_enabled"

export type RosterAgesResult = {
  total: number
  recorded: number
  invalid_date: number
  not_permitted: number
  not_enabled: number
  results: { index: number; outcome: RosterAgeOutcome }[]
}
