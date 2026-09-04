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

export type SummitWhyRoot = { stated_goal: string; root: string }

export type SummitSession = {
  version: number
  categories: Record<string, SummitCategory>
  goals: SummitGoal[]
  why_roots?: SummitWhyRoot[]
}

/**
 * The three structured interview calls.
 *
 * These are deliberately NOT chat. The interview is deterministic — the client
 * always knows which category it is on and which rung of the WHY ladder it has
 * reached — so it drives `/ask`, `/why-ladder` and `/synthesize` directly.
 * Routing the same thing through free-text chat and inferring intent would
 * reintroduce exactly the ambiguity these routes exist to remove.
 */

/** POST /ask — the thread of questions for one discovery category. */
export type SummitAskResponse = {
  category: SummitCategoryKey | string
  label: string
  /** One warm sentence opening the topic. May be "". */
  intro: string
  /** 3–4 open questions. The backend caps at 5. */
  questions: string[]
}

/**
 * POST /why-ladder — one rung.
 *
 * `is_root` is the terminator. The backend hard-caps the ladder at 5 rungs and
 * forces `is_root` at the cap, so a client loop on `!is_root` always ends — but
 * the UI counts rungs anyway, because trusting a remote loop bound to be
 * enforced remotely is how you get an interrogation.
 */
export type SummitWhyResponse = {
  is_root: boolean
  /** The next "why" question. "" once `is_root`. */
  question: string
  /** The underlying motivation. "" until `is_root`. */
  root: string
}

/** One rung as the ladder endpoint wants it echoed back. */
export type SummitWhyExchange = { question: string; answer: string }

/** POST /synthesize — captured answers become structured goals. */
export type SummitSynthesizeResponse = {
  goals: SummitGoal[]
  session: SummitSession
}

// ─── The shared record (Store B) — Goals offering, Phases 1–3 ───────────
//
// What a person publishes from their session becomes a row in `public.goals`
// (the record every coach surface reads), served back to them by
// `GET /v1/agents/goals/mine` in the camelCase `SummitGoal` contract from
// `@/types/development` — the SAME shape the coach-side GoalsPanel renders,
// which is what lets the sharing panel preview "what they see" with the coach's
// own card rather than a redrawn one. These routes DO use the `ok()` envelope
// (`{status, data}`), unlike the session routes above.

export type GoalVisibility = "shareable" | "private"
export type GoalSource = "seed" | "member"

/** A published goal: the coach contract plus the Phase 1 columns. */
export type SharedGoal = import("@/types/development").SummitGoal & {
  source: GoalSource
  /** Per-goal privacy switch (D5). A private goal is never shown to a viewer. */
  visibility: GoalVisibility
  /** The session goal_id it was published from; null for seed rows. */
  publishedFrom: string | null
  publishedAt: string | null
  /** Coach reviews — empty until Phase 4 fills it. */
  reviews?: unknown[]
}

export type MyGoalsResponse = {
  memberId: string
  goals: SharedGoal[]
  coverage: import("@/types/development").GoalCategoryCoverage[]
}

/** Body for POST /v1/agents/goals — a quick-added session goal. */
export type SummitGoalCreate = {
  title: string
  category?: SummitCategoryKey
  time_horizon?: "short" | "medium" | "long"
  motivation?: string
  success_metric?: string
  first_step?: string
  owning_coach?: string
}
