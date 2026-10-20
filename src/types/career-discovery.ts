/** Career & Education Discovery (DISC-1) — wire types. Backend: app/routes/career_discovery.py */

export type AgeBand = "under_13" | "13_17" | "18_plus"

export type DiscoveryStageState = "not_started" | "in_progress" | "complete" | "skipped"

export type DiscoveryStage = {
  id: string
  name: string
  question: string
  outcome: string
  available: boolean
  comingNext?: string
  state?: DiscoveryStageState
}

export type DiscoveryJourney = {
  ageBand: AgeBand | null
  ageFloor: number
  mayProceed: boolean
  schoolLevel: string | null
  interests: string[]
  stageStatus: Record<string, DiscoveryStageState>
  stages: DiscoveryStage[]
  nextAction: DiscoveryStage & { id: string | null }
  artefactKeys: string[]
  createdAt: string | null
  updatedAt: string | null
}

export type DiscoveryStatus = { enabled: boolean }

export type CareerFamily = {
  family: string
  affinity: number
  pivotDifficulty?: string
  distance?: number
}

export type DiscoveryCareers = {
  families: CareerFamily[]
  topFamilies?: string[]
  skillLadders?: { family: string; steps: string[] }[]
  note?: string | null
}

export type WageRange = {
  low: number
  median: number
  high: number
  source: string
  asOf: string
}

export type PayArea = {
  family: string
  affinity: number | null
  range: WageRange | null
  note: string | null
}

export type DiscoveryPays = {
  areas: PayArea[]
  ranked: boolean
  provider?: string
  asOf?: string
  note?: string | null
}

export type DiscoveryGoals = { count: number; titles: string[] }

export type AlignmentGoal = {
  goalId?: string | null
  title: string
  verdict: string
  statement?: string
}

export type AlignmentResult = {
  goals?: AlignmentGoal[]
  summary?: Record<string, number>
  note?: string
  goalsPending?: boolean
  prismNeeded?: boolean
}

export type DiscoveryJob = {
  jobId: string
  kind: string
  status: "queued" | "running" | "complete" | "error"
  error?: string | null
  result?: AlignmentResult | null
}

export type DiscoveryAlignment = {
  result: AlignmentResult | null
  job: Omit<DiscoveryJob, "result"> | null
}

export type DiscoveryPlan = {
  schoolLevel: string | null
  interests: string[]
  careerAreas: { family: string; range: WageRange | null }[]
  goalsCount: number
  alignment: { summary?: Record<string, number>; note?: string } | null
  nextSteps: { stageId: string; name: string; question: string }[]
  comingNext: { stageId: string; name: string; note?: string }[]
}

/** Mirrors `SCHOOL_LEVELS` in app/tools/career_discovery/store.py. */
export const SCHOOL_LEVELS: { value: string; label: string }[] = [
  { value: "middle_school", label: "Middle school" },
  { value: "high_school", label: "High school" },
  { value: "community_college", label: "Community college" },
  { value: "university", label: "University" },
  { value: "graduate_school", label: "Graduate school" },
  { value: "adult_learner", label: "Adult learner" },
  { value: "not_in_school", label: "Not in school right now" },
]
