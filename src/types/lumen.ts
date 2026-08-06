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

/**
 * The eight behavioural dimensions, two per quadrant.
 *
 * The quadrant scores are means of these, and a mean hides which of its two
 * dimensions is carrying it: a Green of 68 built from Innovating 90 /
 * Initiating 46 describes a very different person from one built from 67 / 69,
 * and both used to render identically.
 */
export type PrismDimensionKey =
  | "innovating"
  | "initiating"
  | "supporting"
  | "coordinating"
  | "focusing"
  | "delivering"
  | "finishing"
  | "evaluating"

/** Absent = not measured. Same contract as `PrismQuadrantScores`. */
export type PrismDimensionScores = Partial<Record<PrismDimensionKey, number>>

/**
 * Introversion / Extroversion.
 *
 * PRISM stores these in the same category as the eight dimensions, but they
 * belong to no quadrant — they describe energy direction, not working style.
 * Kept separate from `quadrants` and `dimensions` for that reason, and rendered
 * as a spectrum rather than a bar: neither end is "more".
 */
export type PrismOrientation = Partial<
  Record<"introversion" | "extroversion", number>
>

export type PrismAnchor = {
  dominant_quadrant: PrismQuadrant
  quadrants: PrismQuadrantScores
  /** Optional for back-compat with an engine that predates the full read. */
  dimensions?: PrismDimensionScores
  orientation?: PrismOrientation
  /**
   * Which variant these scores are — PRISM stores up to three per dimension
   * (Underlying / Adapted / Consistent). `null` means the stored rows carried
   * no variant, which must be reported as unknown rather than assumed.
   */
  score_type?: string | null
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
 * A situation the user chose to keep for reuse in the ask box.
 *
 * Distinct from a Moment: every ask is already stored as a Moment with its
 * guidance, so these are curation, not history. Deleting one leaves the
 * guidance it produced intact.
 */
export type SavedPrompt = {
  id: string
  /** The situation text, as the user typed it (whitespace-normalised). */
  text: string
  /** Optional short name. Null means "show the text". */
  label: string | null
  /** Bumped on each reuse — the list is ordered by this, not by recency. */
  use_count: number
  last_used_at: string | null
  created_at: string | null
}

export type SavedPromptsList = {
  prompts: SavedPrompt[]
}

/** The single next action in Lumen's onboarding funnel. */
export type OnboardingNextStep =
  | "request_prism"
  | "complete_survey"
  | "awaiting_report"
  | "ready"

export type PrismRequestSummary = {
  request_id: string
  /** The questionnaire link, when PRISM has issued one. */
  survey_url: string | null
  requested_at: string | null
  completed_at: string | null
  ingest_status: string | null
}

/**
 * Onboarding progress. Derived server-side from PRISM requests + the composed
 * portrait — deliberately carries no entitlement or billing state.
 */
export type OnboardingStatus = {
  next_step: OnboardingNextStep
  has_portrait: boolean
  instruments: string[]
  prism_request: PrismRequestSummary | null
}

export type PrismRequestBody = {
  forename: string
  surname: string
  /** Optional — the backend falls back to the email on the caller's token. */
  email?: string
}

export type PrismRequestResult = {
  request_id: string
  survey_url: string | null
  status: string
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

/**
 * The four evidence sources a portrait can rest on, in the order the backend
 * reports them (`self_portrait.py::SOURCE_KEYS`).
 */
export type PortraitSourceKey = "prism" | "assessments" | "resume" | "bio"

/**
 * Which sources this person actually has. Always carries all four keys, so the
 * UI can show what's missing as readily as what's present — an absent key would
 * be indistinguishable from "not yet loaded".
 */
export type PortraitSources = Record<PortraitSourceKey, boolean>

/**
 * One observation drawn from the résumé or bio.
 *
 * Deliberately a separate concept from `CorroboratingInstrument`. An instrument
 * is a measurement carrying a calibrated confidence band from the licensed
 * manual; this is a reading of what someone wrote about themselves. Rendering
 * the two alike would launder one into the other, which is why this type has no
 * `confidence` field and never maps to a quadrant.
 */
export type PortraitEvidenceItem = {
  source: Extract<PortraitSourceKey, "resume" | "bio">
  /** `span` = a period the résumé covers; `emphasis` = a recurring theme. */
  kind: "span" | "emphasis"
  label: string
  detail: string
}

/**
 * A narrated read of the Self-Portrait, or an answer to a question about it.
 * Both come from `POST /self-portrait/{id}/ask`: no question → a description
 * (`is_description: true`); a question → an answer. `answer` is markdown.
 */
export type PortraitAnswer = {
  answer: string
  is_description: boolean
  disclaimer: string
}

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
  /**
   * Optional only for back-compat with a deployment older than the four-source
   * composer — every current backend sends both.
   */
  sources?: PortraitSources
  /** One line on what the portrait rests on and what would sharpen it next. */
  coverage?: string
  /**
   * What the résumé and bio contribute. Descriptive observations, never
   * measurements — see `evidence_note`. Optional for back-compat.
   */
  evidence?: PortraitEvidenceItem[]
  /** The caveat that rides with `evidence`. Null when there is none to show. */
  evidence_note?: string | null
}
