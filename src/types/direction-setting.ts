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
