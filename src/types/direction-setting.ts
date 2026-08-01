/**
 * Direction Setting — domain types.
 *
 * Mirrors `services/agent-engine/app/tools/direction_setting/stages.py` and the
 * journey serialiser in `journey.py`. The stage list is **served**, not
 * hardcoded here, so a stage added or reworded on the backend changes the
 * product without a coordinated frontend release — these types describe the
 * shape, not the content.
 */

/** How far a single stage has got. */
export type StageState = "not_started" | "in_progress" | "complete" | "skipped"

/** The journey as a whole. */
export type JourneyStatus = "not_started" | "in_progress" | "complete"

/**
 * One stage definition as the backend serves it.
 *
 * `needs` names what the stage cannot run without. The journey never blocks on
 * it — every stage is enterable — but the surface uses it to say *why* a stage
 * will be thin, which is the difference between an empty page and an explained
 * one.
 */
export type JourneyStage = {
  id: string
  name: string
  question: string
  outcome: string
  needs: string[]
  state: StageState
}

/**
 * The single next thing to put in front of the user.
 *
 * `id` is `null` — and only null — when every stage is done. `Omit` rather than
 * a plain intersection: `JourneyStage & { id: string | null }` collapses `id`
 * back to `string`, which makes the finished-journey case the backend actually
 * sends impossible to express.
 */
export type NextAction = Omit<JourneyStage, "id"> & { id: string | null }

export type Journey = {
  userId: string
  /** Furthest stage reached — not the current one. */
  stage: number
  status: JourneyStatus
  stageStatus: Record<string, StageState>
  stages: JourneyStage[]
  nextAction: NextAction
  artefactKeys: string[]
  createdAt: string | null
  updatedAt: string | null
}

export type AdvanceInput = {
  stageId: string
  state?: StageState
  artefact?: Record<string, unknown>
}

/** Stage 3 — one role family ranked against the user's PRISM. */
export type RoleFamilyAffinity = {
  family: string
  /** 0–100, weight-normalised mean. */
  affinity: number
  pivotDifficulty: string
  distance: number
  dimensionsConsidered: number
}

export type CareerSkillLadder = {
  family: string
  steps: string[]
}

export type CareerAreas = {
  families: RoleFamilyAffinity[]
  topFamilies?: string[]
  skillLadders?: CareerSkillLadder[]
  dimensionsEvaluated?: number
  /**
   * Present when the result is empty for an explainable reason — most often no
   * PRISM on file yet. Render it instead of an error: a new user reaching
   * Stage 3 before Stage 1 is the normal case.
   */
  note?: string
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stage 6 — Align.
 *
 * Mirrors `app/tools/direction_setting/alignment.py` (`build_alignment`) and
 * `app/tools/direction_setting/direction_jobs.py` (`to_dict`).
 *
 * The stage sits on the **async job** path: it hydrates a behavioural profile,
 * reads the shared Summit goal store and scores every goal against nine role
 * families, which comfortably exceeds API Gateway's 30-second hard cap. So the
 * contract is accept-then-poll, not request-response.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The five verdicts.
 *
 * Four are Honor's. `unscored` is this stage's, and it is load-bearing: with no
 * PRISM on file the scorer imputes every missing dimension to neutral, which
 * lands every goal near 50 and therefore on "mixed". A person with no
 * assessment would read a screenful of measured-looking middling verdicts about
 * goals nothing was ever measured against. `unscored` says the true thing —
 * **never render it as a low score.**
 */
export type AlignmentVerdict =
  | "supported"
  | "mixed"
  | "at-tension"
  | "unmapped"
  | "unscored"

/** queued → running → complete | error. Nothing writes past the last two. */
export type AlignmentJobStatus = "queued" | "running" | "complete" | "error"

/**
 * One dimension driving a goal's verdict, carrying **both** numbers.
 *
 * "You are low on Investigative & Analytical" is an opinion; "you 34, this kind
 * of work usually asks 90" is a fact the person can check against their own
 * PRISM report. Never print one number without the other.
 *
 * `yourScore` is `null` — not 50 — when the dimension was imputed. A neutral
 * placeholder printed as a score is a fabricated measurement.
 */
export type AlignmentDimension = {
  dimension: string
  category?: string | null
  categoryLabel?: string | null
  dimensionId?: string | null
  yourScore: number | null
  roleNeeds: number
  closeness?: number
  imputed?: boolean
}

/** The dimensions holding a goal up, and the ones pulling against it. */
export type AlignmentDrivers = {
  supporting?: AlignmentDimension[]
  opposing?: AlignmentDimension[]
}

/** One stated goal, scored (or honestly not) against the role families. */
export type AlignmentGoal = {
  goalId?: string | null
  title: string
  category?: string | null
  horizon?: string | null
  status?: string | null
  /** Archetype key, or null when the mapper declined to place the goal. */
  area?: string | null
  /** The role family in the same words Stage 3's `/careers` uses. */
  family?: string | null
  /** 0–100, or null for `unmapped` / `unscored`. */
  score: number | null
  verdict: AlignmentVerdict
  /** True exactly when `verdict === "at-tension"`. */
  conflict: boolean
  drivers?: AlignmentDrivers
  /** The finding in one plain sentence — a fixed backend template, not a model call. */
  statement: string
}

/**
 * A goal the mapper could not place against any role family.
 *
 * The mapper is deliberately conservative (whole-word match only), so this list
 * is expected to be non-empty for real users. **Show it.** A goal quietly
 * vanishing from a person's own alignment report is a worse failure than an
 * honest "we couldn't place this one".
 */
export type AlignmentUnmappedGoal = {
  goalId?: string | null
  title: string
  statement: string
}

export type AlignmentSummary = {
  total: number
  supported?: number
  mixed?: number
  atTension?: number
  unmapped?: number
  unscored?: number
}

/** How much evidence backed the evaluation, and what was missing. */
export type AlignmentConfidence = {
  score?: number
  band?: string
  behavioralBasis?: boolean
  present?: string[]
  missing?: string[]
  note?: string
}

/** The stage-6 report itself — what a completed job returns. */
export type AlignmentResultPayload = {
  userId?: string
  goals: AlignmentGoal[]
  /** The at-tension goals again, surfaced so the finding needs no filtering to notice. */
  conflicts: AlignmentGoal[]
  unmapped: AlignmentUnmappedGoal[]
  careerFitRanked?: { area: string; family: string; score: number }[]
  summary: AlignmentSummary
  scored?: boolean
  /** True when there is no behavioural assessment to score against. */
  prismNeeded?: boolean
  /** True when no goals are on file yet. Not an error — the normal early state. */
  goalsPending?: boolean
  dimensionsRead?: string[]
  dimensionsImputed?: string[]
  confidence?: AlignmentConfidence
  /** The one line explaining what this report is and what it is not. */
  note?: string
}

/** `GET /alignment/jobs/{jobId}`. */
export type AlignmentJob = {
  jobId: string
  kind: string
  status: AlignmentJobStatus
  result?: AlignmentResultPayload | null
  error?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

/** `POST /alignment/jobs` — 202, before any work has happened. */
export type AlignmentJobStarted = {
  jobId: string
  kind: string
  status: AlignmentJobStatus
}

/**
 * `GET /alignment` — the cheap read.
 *
 * The stored artefact plus the latest job's status, minus its result (the
 * artefact already carries it). Lets the surface tell "never run" from "running
 * right now" from "failed" in one call, and lets a returning user reattach to a
 * job in flight instead of paying for a second compute.
 */
export type AlignmentStored = {
  result: AlignmentResultPayload | null
  job: Omit<AlignmentJob, "result"> | null
}
