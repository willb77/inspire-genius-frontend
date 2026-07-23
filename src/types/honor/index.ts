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
/** Per-source contribution to the evidence-confidence measurement. */
export type HonorConfidenceRow = {
  source: string
  label: string
  weight: number
  present: boolean
  contribution: number
}

/**
 * How much evidence backed the evaluation (0–100) + a per-source breakdown, so
 * the coach can SEE the fit-score degrade as PRISM / another assessment /
 * résumé / bio are missing or excluded.
 */
export type HonorConfidence = {
  score: number
  band: "high" | "moderate" | "low"
  behavioralBasis: boolean
  present: string[]
  missing: string[]
  breakdown: HonorConfidenceRow[]
  note: string
}

export type HonorEvaluation = {
  subject_id: string
  objective_evaluation: HonorCitedClaim[]
  development_areas: HonorCitedClaim[]
  career_fit_ranked: HonorCareerFit[]
  goals_fit: HonorGoalFit[]
  comparative: HonorComparative | null
  frameworks: string[]
  imputed_features: string[]
  confidence?: HonorConfidence
  notes: string
}

/**
 * A saved evaluation summary (from GET …/{id}/evaluations) — the history-list
 * shape, without the heavy backbone/narrative blobs.
 */
export type HonorSavedEvaluationSummary = {
  id: string
  fellowId: string
  /** Coach-supplied (or generated) label. */
  title: string
  /** The evaluation criteria the coach entered. */
  criteria: string
  /** Which dimensions were computed. */
  dimensions: string[]
  /** True when Nova's narrative was saved alongside the backbone. */
  hasNarrative: boolean
  /** ISO timestamp. */
  createdAt: string | null
}

/**
 * A saved evaluation, full view (from GET …/{id}/evaluations/{eid}) — includes
 * the deterministic backbone + Nova's narrative so the surface can reload a past
 * run verbatim and the résumé rewrite can key off its suggestions.
 */
export type HonorSavedEvaluation = HonorSavedEvaluationSummary & {
  /** How the run was grounded (frameworks, includeResume/Bio, comparison ids). */
  sourcesUsed: Record<string, unknown>
  /** The deterministic evaluation backbone. */
  evaluation: HonorEvaluation | Record<string, never>
  /** Nova's narrative markdown (may be empty). */
  narrativeMarkdown: string
}

/** Request body for saving an evaluation (POST …/{id}/evaluations). */
export type SaveEvaluationBody = {
  evaluation?: HonorEvaluation | null
  narrativeMarkdown?: string
  criteria?: string
  dimensions?: string[]
  sourcesUsed?: Record<string, unknown>
  title?: string
}

/** An assessment a fellow has submitted (from GET …/{id}/sources). */
export type HonorFellowAssessmentSource = {
  framework: string
  frameworkVersion?: string | null
  assessedAt?: string | null
  scoreCount: number
}

/** The sources a fellow has on file — powers the Evaluate selection UI. */
export type HonorFellowSources = {
  fellowId: string
  managed: boolean
  assessments: HonorFellowAssessmentSource[]
  resume: boolean
  bio: boolean
  /** An "additional information" document (doc_kind "personal") is on file. */
  additionalInfo: boolean
  /** The fellow has stored goals & objectives text. */
  goals: boolean
}

/** GET/PUT …/{id}/goals — the fellow's stored goals & objectives text. */
export type HonorFellowGoals = {
  fellowId: string
  goals: string | null
  hasGoals: boolean
}

/** POST …/students/sources-bulk → per-fellow sources keyed by fellow id. */
export type HonorSourcesBulk = Record<string, HonorFellowSources>

/** One PRISM score row from the imported CSV. */
export type HonorPrismScore = {
  category: string
  dimension: string
  subDimension?: string | null
  scoreType?: string | null
  /** Numeric value when present. */
  score?: number | null
  scoreText?: string | null
  rank?: number | null
}

/**
 * A fellow's PRISM report (from GET …/{id}/prism). When `hasReport` is false
 * the Fellow Profile shows a "Request a PRISM Report" action instead of scores.
 */
export type HonorPrismReport = {
  fellowId: string
  managed: boolean
  hasReport: boolean
  assessedAt?: string | null
  frameworkVersion?: string | null
  scoreCount?: number
  scores: HonorPrismScore[]
}

/** Which of a fellow's sources to ground an evaluation on. */
export type HonorSourceSelection = {
  /** null/undefined → all assessments; explicit list → only those frameworks. */
  assessmentFrameworks?: string[] | null
  includeResume: boolean
  includeBio: boolean
}

// ── Résumé writer (Phase 5 backend: POST …/{fellow_id}/resume) ────────────────
// Mirrors the agent-engine résumé payload verbatim (snake_case). The model writes
// the CONTENT of each field (grounded on the Fellow's own profile + résumé/bio,
// framed by THF safe-translation); the UI renders + brands it deterministically.

export type HonorResumeExperience = {
  title: string
  organization: string
  dates: string
  bullets: string[]
}

/** A generated private-sector résumé draft for a Fellow. */
export type HonorResume = {
  fellow_id: string
  /** The target role/area the résumé was written for. */
  target: string
  headline: string
  summary: string
  competencies: string[]
  experience: HonorResumeExperience[]
  education: string[]
  certifications: string[]
  /** Frameworks that grounded the draft (e.g. ["PRISM"]). */
  frameworks: string[]
  /** Human-readable provenance, e.g. ["Fellow's résumé", "PRISM"]. */
  sources: string[]
  grounded: boolean
  disclaimer: string
  /** True when the draft was rewritten from a prior evaluation's suggestions. */
  fromEvaluation?: boolean
}

/** The route returns this shape while the server `honor_resume` flag is off. */
export type HonorResumeDisabled = { disabled: boolean }

/** Request body for the résumé route (any/all optional). */
export type HonorResumeBody = {
  role?: string
  careerArea?: string
  positionText?: string
  /**
   * Feature 2 — rewrite keyed off a prior evaluation. Supply a saved
   * evaluation's id (the server loads it and pulls its "Suggestions for
   * Improvement") or pass improvement text directly. Neither set → plain
   * generation, unchanged.
   */
  evaluationId?: string
  improvements?: string
}

/** Request body for the evaluate route. */
export type HonorEvaluateBody = {
  /** Free-text goals or explicit { goal, area } objects. */
  goals?: Array<string | { goal: string; area?: string }>
  /** Free-text description of what to evaluate (the evaluation criteria). */
  criteria?: string
  /** Which evaluation dimensions to compute (subset; default all). */
  dimensions?: string[]
  /** Comparative subjects (owned fellow ids); ownership-gated server-side. */
  memberIds?: string[]
  /** Career area to compute the team read against. */
  targetArea?: string
  /** Optional precomputed position-description vector. */
  positionVector?: Record<string, number>
  /** Source subset to evaluate on (omit → the fellow's full profile). */
  sources?: HonorSourceSelection
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

// ── Live Coach Workbench contract (agent-engine Honor router) ─────────────────
//
// The backend surfaces these under the `agentApi` instance, Honor envelope
// `{ status: true, data: … }`. Distinct from the Phase-0 scaffold shapes above
// (`CoachActivityRow` / `ScheduleEvent`), which back the mock fixtures — these
// model the real endpoints wired by schedule.service.ts + useHonorSchedule.ts.
// Every read degrades to an empty list when the endpoint is not yet deployed.

/** GET /v1/agents/honor/coach/activity → { items: HonorActivityItem[] } (newest first). */
export type HonorActivityItem = {
  id: string
  /** Machine action code, e.g. "evaluation.ran" / "member.invited". */
  action: string
  /** Who performed it (display name). */
  actor: string
  /** What it acted on (fellow / cohort / document), if any. */
  target?: string | null
  /** ISO-8601 timestamp. */
  when: string
  /** Human-readable one-line description. */
  summary: string
}

/** A calendar session on the coach's schedule (GET/POST/PATCH …/coach/schedule). */
export type HonorSession = {
  id: string
  title: string
  description?: string | null
  /** Session kind, e.g. "session" | "debrief" | "milestone" | "interview". */
  kind?: string | null
  /** ISO-8601 start timestamp. */
  startsAt: string
  /** ISO-8601 end timestamp (optional). */
  endsAt?: string | null
  location?: string | null
  /** The fellow this session is with, if any (id from the caseload). */
  fellowId?: string | null
}

/** Body for creating a session (POST …/coach/schedule). */
export type HonorSessionInput = {
  title: string
  startsAt: string
  endsAt?: string | null
  description?: string | null
  kind?: string | null
  location?: string | null
  fellowId?: string | null
}

/** Partial body for editing a session (PATCH …/coach/schedule/{id}). */
export type HonorSessionPatch = Partial<HonorSessionInput>

/**
 * Body for scheduling one session per fellow in a single request
 * (POST …/coach/schedule/sessions). The backend spaces the sessions by
 * `spacingMin` starting at `startsAt` and (optionally) emails an .ics invite.
 */
export type HonorBulkSessionInput = {
  fellowIds: string[]
  /** ISO-8601 start of the first session. */
  startsAt: string
  durationMin: number
  spacingMin: number
  topic: string
  message?: string
  /** Email the .ics invite to each fellow (coach cc'd). */
  sendInvites?: boolean
}

/** Result of a bulk schedule request. */
export type HonorBulkSessionResult = {
  created: HonorSession[]
  emailed: number
  skipped: { fellowId: string; reason: string }[]
}

/**
 * GET …/coach/schedule/feed-url → `{ token, feedUrl }` — an .ics subscribe URL.
 * `feedUrl` is the backend field name; `url` is tolerated as a legacy alias.
 */
export type HonorScheduleFeed = {
  feedUrl?: string
  token?: string
  /** Legacy/alias field name — read as a fallback for `feedUrl`. */
  url?: string
}

/** GET …/coach/schedule/google/connect → { available, authUrl?, reason? } (OAuth gate). */
export type HonorGoogleConnect = {
  available: boolean
  reason?: string | null
  /** Google consent URL to send the coach to when `available` is true. */
  authUrl?: string
}

/** GET …/coach/schedule/google/status → { connected, googleEmail? }. */
export type HonorGoogleStatus = {
  connected: boolean
  /** The Google account email the coach connected, when known. */
  googleEmail?: string | null
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
