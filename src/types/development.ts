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
  gaps: DevelopmentGap[]
  learning: LearningItem[]
  milestones: Milestone[]
  matches: CareerMatch[]
  trajectory?: "on_track" | "at_risk"
  events?: DossierEvent[]
  computedAt?: string
}
