// Goals Studio Feeds Phase 3 — goal targets and roadmaps (agent engine,
// `/v1/agents/goal-targets`, `{status, data}` envelope).

import type { SharedGoal } from "@/types/summit"

export type RoadmapCanon = {
  section: string
  dimension: string
  definition: string
  descriptors: string
}

export type RoadmapMilestone = {
  itemId: string
  gapId: string
  competency: string
  title: string
  source: string
  severity: "critical" | "moderate" | string
  rank: number
  direction: "below" | "above" | null
  currentScore: number | null
  targetScore: number | null
  magnitude: number | null
  format: string
  why: string
  canon: RoadmapCanon | null
}

export type Roadmap = {
  engineVersion: string
  wording: "deterministic"
  goalId: string
  goalTitle: string
  targetRole: { title: string | null; blueprintId: string | null } | null
  fitScore: number | null
  start: { firstStep: string | null; pending: boolean }
  milestones: RoadmapMilestone[]
  finish: { successMetric: string | null; pending: boolean }
  gapsPending: boolean
  advisories: { overdone: { dimension: string | null; candidateScore: number | null }[] }
  learningFormat: string
  sequenceBasis: string
  note: string
}

export type RoadmapRecord = {
  roadmapId: string
  goalId: string
  targetId: string
  engineVersion: string
  roadmap: Roadmap
  supersededAt: string | null
  createdAt: string | null
}

export type GoalTarget = {
  targetId: string
  goalId: string
  memberId: string
  jobId: string
  roleTitle: string
  fitSnapshot: Record<string, unknown>
  createdAt: string | null
  updatedAt: string | null
}

export type GoalTargetWithRoadmap = GoalTarget & { roadmap: RoadmapRecord | null }

export type MakeTargetIn = {
  jobId: string
  fitSnapshot: Record<string, unknown>
  /** One of my published goals; omitted → the role's own goal ("create new"). */
  goalId?: string
}

export type MakeTargetOut = {
  goal: SharedGoal
  target: GoalTarget
  roadmap: RoadmapRecord
}
