/**
 * Summit (goal setting) — the live session contract.
 *
 * Mirrors `services/agent-engine/app/goals/store.py`, which persists one JSON
 * blob per user. Two things worth knowing before editing these types:
 *
 * 1. **These routes do NOT use the `ok()` envelope.** `/v1/agents/goals/*`
 *    returns the session dict at the top level, unlike every Direction Setting
 *    route. So there is no `VerticalApiResponse` unwrap in the service — adding
 *    one silently yields `undefined`.
 * 2. **There are two goal stores in the platform and they disagree.** This one
 *    (`app/goals/store.py`, reachable at `/v1/agents/goals`) uses the category
 *    keys below and the status `proposed`. The ORM store (`app/memory/
 *    goal_store.py`, served at `/v1/goals/{member_id}` for managers) uses
 *    `career_history`/`current_job`/… and `provisional`/`confirmed`. Summit is
 *    the member-facing surface, so it wires to the first. Do not mix them: the
 *    manager surface also reaches the browser through a different gateway path.
 */

/** The five discovery categories, in the order the backend fixes them. */
export const SUMMIT_CATEGORY_KEYS = [
  "history",
  "job",
  "workplace",
  "ambitions",
  "personal",
] as const

export type SummitCategoryKey = (typeof SUMMIT_CATEGORY_KEYS)[number]

/** Backend vocabulary — matches the mock's, which was ported from the same spec. */
export type SummitCategoryStatus = "todo" | "active" | "explored"

export type SummitAnswer = {
  question: string
  answer: string
}

export type SummitCategory = {
  label: string
  status: SummitCategoryStatus
  answers: SummitAnswer[]
  /** Written by POST /discovery/{category}. Often "" — render nothing, not "undefined". */
  summary: string
}

/**
 * How a goal sits against the person's behavioural profile.
 *
 * `relationship` is the backend's vocabulary. The UI's shorter
 * lever/stretch/counter labels are a presentation concern and are mapped at the
 * edge, so a backend rename surfaces as a compile error rather than a blank pill.
 */
export type SummitPrismAlignment = {
  relationship?: "leverages_strength" | "requires_stretch" | "counterbalance"
  dimensions?: string[]
  quadrant?: string
}

export type SummitGoalStatus = "proposed" | "confirmed" | string

export type SummitGoal = {
  goal_id: string
  title: string
  category?: SummitCategoryKey | string
  time_horizon?: "short" | "medium" | "long" | string
  /** The WHY-ladder root — the reason underneath the goal. */
  motivation?: string
  prism_alignment?: SummitPrismAlignment
  execution_style?: string
  success_metric?: string
  first_step?: string
  owning_coach?: string
  status: SummitGoalStatus
}

export type SummitSession = {
  version: number
  categories: Record<string, SummitCategory>
  goals: SummitGoal[]
  why_roots?: { stated_goal: string; root: string }[]
}
