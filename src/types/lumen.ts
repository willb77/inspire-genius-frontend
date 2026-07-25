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
