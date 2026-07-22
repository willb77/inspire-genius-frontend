// Practitioner "coach client" domain types.
//
// This is the typed seam for the practitioner client-management surfaces
// (My Clients, Schedule, Analytics). The data currently comes from a stub
// service (src/services/practitioner/coachClient.service.ts); the seam lets the
// backend be swapped in later (generalize the Honor coach routes to
// /v1/agents/coach/* — see the build plan) without touching the pages.

export type ResourceKey =
  | "prism_csv"
  | "disc"
  | "clifton"
  | "mbti"
  | "big_five"
  | "hogan"
  | "resume"
  | "bio"
  | "additional_info"
  | "goals"

export type ResourceDef = {
  key: ResourceKey
  label: string
  /** assessment = score file, document = uploaded doc, text = free text */
  kind: "assessment" | "document" | "text"
}

/** The 10 canonical client resources shown in the resource-presence matrix. */
export const CLIENT_RESOURCES: ResourceDef[] = [
  { key: "prism_csv", label: "PRISM CSV", kind: "assessment" },
  { key: "disc", label: "DISC", kind: "assessment" },
  { key: "clifton", label: "CliftonStrengths", kind: "assessment" },
  { key: "mbti", label: "Myers-Briggs", kind: "assessment" },
  { key: "big_five", label: "Big 5", kind: "assessment" },
  { key: "hogan", label: "Hogan", kind: "assessment" },
  { key: "resume", label: "Résumé", kind: "document" },
  { key: "bio", label: "Bio", kind: "document" },
  { key: "additional_info", label: "Additional info", kind: "document" },
  { key: "goals", label: "Goals", kind: "text" },
]

export type PrismStatus = "ready" | "in_progress" | "none"

export type ClientSummary = {
  id: string
  name: string
  email: string
  org: string
  sessions: number
  prismScore: number | null
  prismStatus: PrismStatus
  topGoals: string[]
  /** number of CLIENT_RESOURCES present on file */
  resourcesPresent: number
  status: "active" | "new"
}

export type SessionEntry = { id: string; date: string; topic: string; durationMin: number }
export type GoalEntry = { id: string; title: string; objective: string }
export type PrismScore = { dimension: string; score: number }
export type ConversationRef = { id: string; date: string; preview: string }
export type FollowUp = { id: string; date: string; note: string }

export type ClientDetail = ClientSummary & {
  sessionsList: SessionEntry[]
  goals: GoalEntry[]
  prismScores: PrismScore[]
  conversations: ConversationRef[]
  /** presence of each of the 10 resources */
  resources: Record<ResourceKey, boolean>
  followUps: FollowUp[]
  topics: string[]
}

export type ScheduleEntry = {
  id: string
  clientName: string
  startsAt: string
  durationMin: number
  topic: string
}

export type BulkScheduleInput = {
  clientIds: string[]
  startsAt: string
  durationMin: number
  spacingMin: number
  topic: string
  message: string
  sendInvites: boolean
}

export type BulkScheduleResult = { created: number; emailed: number; entries: ScheduleEntry[] }

export type CreditsSummary = { balance: number; allocated: number; used: number; currency: string }
export type ClientUsageRow = { clientName: string; sessions: number; creditsUsed: number; lastActive: string }
