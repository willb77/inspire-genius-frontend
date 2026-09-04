/**
 * Team Development Studio — canonical dossier types.
 *
 * The Studio composes existing IG specialist agents (Aura, Summit, James, Nova,
 * Echo) into one per-member Development Dossier, synthesized by Meridian and
 * persisted by the growth-service. These types are the shared contract between
 * the frontend (Service → Hook → Component), growth-service Pydantic response
 * models, and the agent-engine dossier orchestration.
 *
 * PRISM is the behavioral source of truth; CliftonStrengths and DISC are
 * interpretive overlays. Missing frameworks degrade gracefully (lowered,
 * visible confidence), never error.
 *
 * NOTE: PRISM dimensions/quadrants are NOT redefined here — they reuse the
 * canonical config in `@/constants/prism` (BEHAVIOUR_CONFIG = 8 dimensions,
 * QUADRANT_CONFIG = 4 quadrants).
 */

/** 1..8 — keys of BEHAVIOUR_CONFIG in `@/constants/prism`. */
export type PrismDimensionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
/** 1..4 — keys of QUADRANT_CONFIG in `@/constants/prism` (Green/Blue/Red/Gold). */
export type PrismQuadrantId = 1 | 2 | 3 | 4

export type ConfidenceLevel = "high" | "moderate" | "low"

/** One point on the 8-dimension PRISM radar (0–100). */
export type PrismDimension = {
  id: PrismDimensionId
  /** Behaviour label, e.g. "Innovating" — sourced from BEHAVIOUR_CONFIG. */
  label: string
  /** 0–100. */
  score: number
  /** Owning quadrant for coloring. */
  quadrant: PrismQuadrantId
}

/** CliftonStrengths theme (Top 5 or full 34). */
export type CliftonTheme = {
  name: string
  rank: number
  domain: "executing" | "influencing" | "relationship_building" | "strategic_thinking"
  /** The PRISM quadrant this Clifton domain maps to (for the reconciliation view). */
  prismQuadrant?: PrismQuadrantId
}

/** DISC scores with primary/adapted styles. */
export type DiscScores = {
  d: number
  i: number
  s: number
  c: number
  primaryStyle: string
  adaptedStyle?: string
}

/** Aura's cross-framework reconciliation output. */
export type Reconciliation = {
  headline: string
  throughLine: string
  discrepancies: string[]
  confidence: ConfidenceLevel
  /** One or two "how to work with this person" manager-actionable insights. */
  actionableInsights?: string[]
}

/** Which frameworks a member has completed. */
export type FrameworkCoverage = {
  prism: boolean
  clifton: boolean
  disc: boolean
  prismAssessedAt?: string
  cliftonAssessedAt?: string
  discAssessedAt?: string
}

export type BehavioralProfile = {
  prism: PrismDimension[]
  clifton?: CliftonTheme[]
  disc?: DiscScores
  reconciliation: Reconciliation
  coverage: FrameworkCoverage
}

/**
 * One rubric scale, with every score type actually stored for it.
 *
 * `scores` is the wire shape the narrative endpoints want verbatim: a map of
 * score type to value, e.g. `{ Underlying: 62, Adapted: 55 }`. Only the types
 * on file appear — the server never substitutes one for a missing other,
 * because Adapted answers a different question than Underlying in the same
 * units, and a substituted value is indistinguishable from a measured one.
 *
 * Mirrors `growth-service` `schemas.FullPrismScale`.
 */
export type FullPrismScale = {
  /** Rubric key, e.g. `innovating`, `practical_mechanical`. */
  key: string
  label: string
  group: string
  scores: Record<string, number>
}

/**
 * All 88 PRISM scales for one person, as far as they go.
 *
 * Two properties a consumer MUST respect, both of which read as ordinary data
 * if ignored:
 *
 *   - **`coverage < 88` is normal, not an error.** Measured 75–87 on dev plus
 *     one 26-scale legacy outlier; nobody has all 88. Treating a short profile
 *     as a failure rejects every real person. `missing` names the gaps, and a
 *     missing scale is never defaulted to zero — a profile of zeroes is not
 *     "no data", it is a specific and wrong personality.
 *   - **`isConflicted` is a refusal, not a warning.** It means two assessments
 *     under this person disagree, which on dev was two different people's PRISM
 *     reports filed under one account. Show `conflictMessage` and nothing else:
 *     `scales` already excludes the disagreeing entries, but the agreeing
 *     remainder is not trustworthy either, because the overlap that reveals a
 *     conflict is only a lower bound.
 *
 * Mirrors `growth-service` `schemas.FullPrismProfileResponse`.
 */
export type FullPrismProfileResponse = {
  hasData: boolean
  scales: FullPrismScale[]
  /** The four colour means, or null when incomplete OR conflicted. */
  colours?: Record<string, number> | null
  missing: string[]
  coverage: number
  fromLegacyRows: boolean
  isConflicted: boolean
  conflicts: string[]
  conflictMessage?: string | null
}

/**
 * One person on the organisation chart.
 *
 * Name, title, department — and nothing else, deliberately. The chart is
 * visible to every signed-in member of the org, so it carries no assessment
 * coverage, no scores and no contact details. Clicking a card routes to that
 * member's workspace, where the existing per-member gate decides what is shown.
 *
 * Mirrors growth-service `schemas.OrgChartNode`.
 */
export type OrgChartNode = {
  id: string
  name: string
  title?: string | null
  department?: string | null
  /**
   * `null` for a root — and also for anyone whose manager sits outside this
   * org or is deactivated. The server nulls those rather than leaving them
   * dangling, so a person with an unreachable manager still appears as a root
   * instead of vanishing with their whole subtree.
   */
  managerId?: string | null
}

/** One organisation's reporting tree, as flat nodes. See `buildOrgTree`. */
export type OrgChartResponse = {
  nodes: OrgChartNode[]
  /** The viewer's own node, so the chart can mark "you are here". */
  viewerId?: string | null
  /** True when the org exceeded the server's node ceiling. */
  truncated: boolean
}

/** One of Summit's five discovery categories. */
export type GoalCategory =
  | "career_history"
  | "current_job"
  | "workplace_situation"
  | "career_ambitions"
  | "personal_goals"

export type GoalHorizon = "short" | "medium" | "long"

export type PrismAlignmentKind = "leverages" | "stretch" | "counterbalance"

/** How a Summit goal aligns to the member's PRISM map. */
export type PrismAlignment = {
  kind: PrismAlignmentKind
  /** The specific PRISM dimension(s) or quadrant referenced. */
  dimensions?: PrismDimensionId[]
  quadrant?: PrismQuadrantId
  note?: string
}

export type GoalStatus = "provisional" | "confirmed"

/** A Summit Goal record from the shared goal store (source of truth). */
export type SummitGoal = {
  goalId: string
  memberId: string
  title: string
  category: GoalCategory
  horizon: GoalHorizon
  /** The WHY-ladder root — why it truly matters. */
  motivation: string
  prismAlignment: PrismAlignment
  /** Quadrant-tailored framing (Green/Blue/Red/Gold). */
  executionStyle: string
  successMetric: string
  /** One non-threatening, reward-framed next action. */
  firstStep: string
  /** The owning specialist coach the goal is routed to. */
  ownerCoach: string
  status: GoalStatus
  /** Quotes from the discovery conversation that produced this goal. */
  provenanceQuotes: string[]
  createdAt?: string
  updatedAt?: string
}

/** A coach's review of one shared goal (Goals offering, Phase 4, D7). */
export type GoalReview = {
  id: string
  goalId: string
  memberId: string
  reviewerSub: string
  /** Display name when the roster knows one; else the UI says "Your coach". */
  reviewerName?: string | null
  ratified: boolean
  comment: string
  createdAt?: string | null
  updatedAt?: string | null
}

export type GoalReviewList = {
  memberId: string
  reviews: GoalReview[]
}

/** Per-category discovery coverage, for the five-category strip. */
export type GoalCategoryCoverage = {
  category: GoalCategory
  state: "not_started" | "in_progress" | "covered"
}

export type GapSeverity = "critical" | "moderate" | "minor"

export type DevelopmentGap = {
  gapId: string
  memberId: string
  /** References a Summit goal in the shared goal store, when the gap serves one. */
  goalId?: string
  targetBlueprintId?: string
  competency: string
  currentLevel: number
  targetLevel: number
  severity: GapSeverity
  source: "behavioral" | "skill"
  status: "open" | "in_progress" | "closed"
}

export type LearningItemStatus = "not_started" | "in_progress" | "complete"

export type LearningItem = {
  itemId: string
  memberId: string
  gapId?: string
  goalId?: string
  title: string
  provider: string
  externalRef?: string
  estHours?: number
  /** Matched to learning preference. */
  format?: "visual" | "auditory" | "experiential" | "reading"
  status: LearningItemStatus
  progress?: number
  quizScore?: number
  lmsRef?: string
}

export type MilestoneHorizon = "d30" | "d60" | "d90" | "q" | "y_plus"

export type MilestoneStatus = "planned" | "in_progress" | "done" | "blocked"

export type Milestone = {
  milestoneId: string
  goalId: string
  title: string
  horizon: MilestoneHorizon
  dueDate?: string
  sequence: number
  status: MilestoneStatus
  blockedReason?: string
  /** Gaps this milestone closes and learning items feeding it. */
  gapIds?: string[]
  learningItemIds?: string[]
}

export type FitClassification = "strong_fit" | "potential_fit" | "misalignment"

export type CareerMatch = {
  matchId: string
  memberId: string
  kind: "internal" | "external"
  title: string
  onetCode?: string
  blueprintId?: string
  /** Behavioral-fit score 0–100. */
  fitScore: number
  classification: FitClassification
  rationale: string
  automationRiskHint?: string
  requiredEducation?: string
}

export type PlanStatus = "no_plan" | "draft" | "active" | "on_track" | "at_risk"

/** A member tile on the roster grid. */
export type RosterMember = {
  memberId: string
  name: string
  title?: string
  department?: string
  avatarUrl?: string
  coverage: FrameworkCoverage
  reconciledHeadline?: string
  headlineConfidence?: ConfidenceLevel
  planStatus: PlanStatus
  milestoneProgress?: number
  topMatch?: Pick<CareerMatch, "title" | "fitScore">
}

/** Provenance record for the "who produced what" audit affordance. */
export type DossierEvent = {
  agent: string
  eventType: string
  confidence?: ConfidenceLevel
  discrepancies?: string[]
  createdAt?: string
}

/** The synthesized, per-member development snapshot. */
export type MemberDossier = {
  memberId: string
  managerId?: string
  orgId?: string
  member: Pick<RosterMember, "name" | "title" | "department" | "avatarUrl">
  reconciledHeadline: string
  overallConfidence: ConfidenceLevel
  profile: BehavioralProfile
  /** Summit's formalized goals (read-only here — the live session runs over WS). */
  goals: SummitGoal[]
  goalCoverage: GoalCategoryCoverage[]
  /** True when the member has PRISM but no goals yet → invite-to-Summit. */
  goalsPending?: boolean
  /** True when the member has no PRISM → route-to-Aura gate. */
  prismNeeded?: boolean
  /** Goals offering, Phase 2: the member has not shared goals with this caller.
   *  Then goals/goalCoverage are empty and goalsPending is null — an explicit
   *  state, never the "no goals yet" empty list. */
  goalsNotShared?: boolean
  gaps: DevelopmentGap[]
  learning: LearningItem[]
  milestones: Milestone[]
  matches: CareerMatch[]
  trajectory?: "on_track" | "at_risk"
  events?: DossierEvent[]
  computedAt?: string
}

// ── Add team members (single + bulk) ─────────────────────────────────────────

/** Payload to add a team member under the calling manager. `prism` optionally
 *  carries the 8 behaviours (id 1..8, score 0..100) to populate the map on add. */
export type MemberCreateInput = {
  name: string
  email?: string
  title?: string
  department?: string
  prism?: { id: number; score: number }[]
}

export type MemberCreateResult = {
  memberId: string
  name: string
  title?: string
  department?: string
  prismWritten: boolean
}

export type BulkMemberRow = {
  ok: boolean
  memberId?: string
  name?: string
  error?: string
}

export type BulkMembersResult = {
  created: number
  failed: number
  rows: BulkMemberRow[]
}

/** The caller's own 8 PRISM behaviours, for the HomeV2 behavioral-map popup. */
export type SelfPrismResponse = {
  dimensions: PrismDimension[]
  hasData: boolean
  assessedAt?: string | null
}
