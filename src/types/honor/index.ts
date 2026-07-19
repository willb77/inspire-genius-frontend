// The Honor Foundation — Coach Workbench vertical: domain types.
//
// These model the coach-facing surface shown in the THF wireframe (Coach
// Workbench). Kept intentionally explicit (no `any`) so the scaffold pages type
// against them and the eventual /v1/coach/* endpoints can return these shapes.
//
// Entitlement identifier: "honor" (see KnownVertical in
// @/types/grant). Presence of that value in the user's enabled_verticals unlocks
// the vertical.

/** Envelope every Honor coach service returns (mirrors the platform BaseApiResponse). */
export type HonorApiResponse<T = unknown> = {
  status?: boolean
  success?: boolean
  message?: string
  data?: T
}

// ── PRISM behavioural framing (from the wireframe's quadrant dots) ────────────

/** PRISM quadrant single-letter code used across the wireframe (G/N/B/O…). */
export type PrismQuad = "G" | "N" | "B" | "O"

export type PrismCode = {
  /** e.g. "Gold-Green" — human label of the dominant pair. */
  label: string
  /** Ordered quadrant codes, dominant first (drives the quad dots). */
  quads: PrismQuad[]
}

// ── Fellow (a THF member on a coach's caseload) ──────────────────────────────

export type FellowStatus = "assessed" | "intake-pending" | "invited"

export type MemberDocument = {
  id: string
  name: string
  kind: "resume" | "bio" | "report" | "other"
  uploadedAt: string
}

/** A THF "fellow" — a Special-Operations veteran in transition. */
export type HonorFellow = {
  id: string
  firstName: string
  lastName: string
  email: string
  /** Prior service background, e.g. "Naval Special Warfare". */
  background: string
  /** Target career direction, e.g. "Program Management". */
  target: string
  prism: PrismCode | null
  /** DISC shorthand, e.g. "DC" (null until assessed). */
  disc: string | null
  /** CliftonStrengths top themes. */
  cliftonStrengths: string[]
  status: FellowStatus
  cohort: string
  docs: MemberDocument[]
}

// ── Coach home (single JWT-scoped hydration: GET /v1/coach/home) ──────────────

export type CoachHome = {
  coachName: string
  coachTitle: string
  counts: {
    assigned: number
    assessed: number
    intakePending: number
  }
  recentActivity: CoachActivityRow[]
  upcomingEvents: ScheduleEvent[]
}

// ── Evaluate surface (multi-agent DAG, synthesized by Meridian) ──────────────

/** Ordered agent trace shown for auditability, e.g. ["Aura","James","Nova","Meridian"]. */
export type AgentTrace = string[]

export type EvaluateAnswer = {
  /** Matched seed-question key (fit | insight | struggle | plan). */
  key: string
  question: string
  trace: AgentTrace
  /** Sanitized HTML body of Meridian's synthesized reply. */
  html: string
}

// ── Deterministic evaluation (Phase 2 backend: POST …/{fellow_id}/evaluate) ───
// These mirror the agent-engine `HonorEvaluation.to_dict()` shape verbatim
// (snake_case as returned by the API). The score math is deterministic
// server-side; the UI only renders + cites it.

/** One behavioural feature's role in an alignment score (drives the citations). */
export type HonorFitFactor = {
  feature: string
  /** Human label, e.g. "PRISM: Coordinating". */
  label: string
  closeness: number
  contribution: number
  /** Source tag, e.g. "PRISM: Coordinating 90". */
  source: string
}

/** A career area (or an uploaded position) ranked by deterministic fit. */
export type HonorCareerFit = {
  area: string
  label: string
  /** 0–100 alignment score. */
  score: number
  top_factors: HonorFitFactor[]
  top_gaps: HonorFitFactor[]
}

/** One source-tagged claim in the objective / development sections. */
export type HonorCitedClaim = {
  statement: string
  source: string
}

export type HonorGoalVerdict = "supported" | "at-tension" | "mixed" | "unmapped"

/** A stated goal scored against the profile. */
export type HonorGoalFit = {
  goal: string
  area: string | null
  label: string | null
  score: number | null
  verdict: HonorGoalVerdict
  factors: HonorFitFactor[]
}

/** Team-composition read against a target area. */
export type HonorTeamRead = {
  target_area: string
  label: string
  covered: string[]
  gaps: string[]
  redundant: string[]
  complementary: string[]
  best_by_feature: Record<string, string>
}

/** Comparative section (1:1 / 1:many / many:many / team). */
export type HonorComparative = {
  subjects: string[]
  areas: string[]
  /** subjectId → area → 0–100 fit. */
  per_subject_area_fit: Record<string, Record<string, number>>
  /** subjectId → subjectId → 0–100 similarity. */
  pairwise_similarity: Record<string, Record<string, number>>
  team_read?: HonorTeamRead
}

/** The full deterministic evaluation returned by the evaluate route. */
export type HonorEvaluation = {
  subject_id: string
  objective_evaluation: HonorCitedClaim[]
  development_areas: HonorCitedClaim[]
  career_fit_ranked: HonorCareerFit[]
  goals_fit: HonorGoalFit[]
  comparative: HonorComparative | null
  frameworks: string[]
  imputed_features: string[]
  notes: string
}

/** Request body for the evaluate route. */
export type HonorEvaluateBody = {
  /** Free-text goals or explicit { goal, area } objects. */
  goals?: Array<string | { goal: string; area?: string }>
  /** Comparative subjects (owned fellow ids); ownership-gated server-side. */
  memberIds?: string[]
  /** Career area to compute the team read against. */
  targetArea?: string
  /** Optional precomputed position-description vector. */
  positionVector?: Record<string, number>
}

/** One row of the compare matrix — a metric scored per fellow (0–100). */
export type CompareMetric = {
  label: string
  /** fellowId → score. */
  scores: Record<string, number>
}

// ── Goals (persisted to user_milestones via Ascend) ──────────────────────────

export type TransitionGoal = {
  id: string
  fellowId: string
  title: string
  /** 0–100 progress. */
  progress: number
  /** true when suggested by the Ascend agent (not yet accepted). */
  suggested?: boolean
}

// ── Activity feed (audit-service: GET /v1/audit/logs, JWT-scoped) ─────────────

export type CoachActivityRow = {
  id: string
  actor: string
  email: string
  event: string
  when: string
  eventId: string
  conversationId: string
}

// ── Schedule (GET /v1/coach/schedule?view=…) ─────────────────────────────────

export type ScheduleView = "year" | "month" | "day"

export type ScheduleEvent = {
  id: string
  /** ISO date (YYYY-MM-DD). */
  date: string
  time: string
  title: string
  fellow?: string
}

// ── Administration (coach + team management) ─────────────────────────────────

export type CoachRecord = {
  id: string
  name: string
  email: string
  title: string
  teams: string[]
}

export type TeamRecord = {
  id: string
  name: string
  memberCount: number
}
