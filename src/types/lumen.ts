/**
 * Lumen domain types.
 *
 * Mirrors the backend composer's output
 * (`services/agent-engine/app/tools/lumen/self_portrait.py::compose_portrait`).
 */

/** The four PRISM quadrants, per the licensed reference manual. */
export type PrismQuadrant = "Green" | "Blue" | "Red" | "Gold"

/**
 * Quadrant scores, keyed by the backend's column names. A quadrant with no
 * scored dimension is absent rather than zero — absent means "not measured",
 * which is not the same as "measured low".
 */
export type PrismQuadrantScores = Partial<
  Record<"green" | "blue" | "red" | "gold" | "orange", number>
>

export type PrismAnchor = {
  dominant_quadrant: PrismQuadrant
  quadrants: PrismQuadrantScores
}

/** One non-PRISM instrument, mapped into PRISM space. */
export type CorroboratingInstrument = {
  framework: string
  /** Calibrated [0,1] — Big Five is the most empirically validated at 0.92. */
  confidence: number
  maps_to: PrismQuadrant
  agrees_with_prism: boolean
}

/** Aggregate confidence band. Never "certainty". */
export type PortraitConfidence = "low" | "moderate" | "high"

/** Why a Moment exists. `pull` = the user asked; the others are proactive. */
export type MomentTrigger = "pull" | "calendar" | "cadence"

/** The user's disposition on a Moment. */
export type MomentState = "new" | "acted" | "dismissed" | "saved"

export type Moment = {
  id: string
  trigger: MomentTrigger
  /** The situation the user described. Null for cadence-driven Moments. */
  context: string | null
  /** The guidance itself, in Meridian's voice. */
  body: string
  state: MomentState
  created_at: string | null
  delivered_at: string | null
  /**
   * Only present on the synchronous ask response: true when generation fell
   * back to deterministic guidance because the model call failed.
   */
  degraded?: boolean
}

export type MomentsFeed = {
  moments: Moment[]
  limit: number
  offset: number
  has_more: boolean
}

export type AskMomentRequest = {
  context: string
  when?: string
}

/**
 * Consent for proactive guidance. Three independent grants, because they carry
 * very different weight — see the backend's `app/tools/lumen/consent.py`.
 */
export type LumenConsent = {
  /** Unprompted Moments in the in-app feed. Defaults to true. */
  proactive: boolean
  /** Read bookings to time Moments. Defaults to false. */
  calendar: boolean
  /** Deliver Moments outside the app. Defaults to false. */
  email: boolean
  /**
   * True when the user has never saved a choice, so these are the defaults.
   * Lets the UI distinguish "never asked" from "asked and agreed".
   */
  is_default: boolean
}

export type ConsentUpdate = Partial<Omit<LumenConsent, "is_default">>

export type SelfPortrait = {
  /** Null when the user has no PRISM assessment on file yet. */
  prism: PrismAnchor | null
  corroborating: CorroboratingInstrument[]
  /** Where other instruments agree with the PRISM anchor. */
  convergences: string[]
  /** Where they disagree. PRISM wins; the tension is surfaced, not resolved. */
  tensions: string[]
  headline: string
  instruments: string[]
  confidence: PortraitConfidence | null
}
