/**
 * N-8 Career Pathways Profile — the shapes `/v1/agents/career-pathways` returns.
 *
 * The profile is a development document the candidate owns. Every section is
 * either `available: true` with its content, or `available: false` with a
 * `reason` the page says out loud — never a silent blank.
 */

export interface CareerPathwaysEnvelope<T> {
  status: boolean
  data: T
}

export interface CareerPathwaysStatus {
  enabled: boolean
  externalSharing: boolean
}

export interface Unavailable {
  available: false
  reason?: string
}

export interface IdentitySection {
  available: true
  name: string
  email?: string
}

export interface PrismSection {
  available: true
  scoreType: string
  colours: { colour: string; band: string; behaviours: string[] }[]
  behaviours: { behaviour: string; band: string; bandMeaning: string; measures: string }[]
  note: string
}

export interface FitRole {
  jobId: string
  roleTitle: string | null
  department?: string | null
  blueprintVersion?: number | null
  tier: string | null
  coverage?: string | null
  verdictWithheld?: boolean
  note?: string
}

export interface FitSection {
  available: true
  roles: FitRole[]
  validatedRoles: number
  note: string
}

export interface PathwaySection {
  available: true
  suggestions: { jobId?: string; roleTitle?: string; roleFamily?: string | null; rationale?: string | null }[]
  skillLadders: { skill: string; steps: string[] }[]
  note: string
}

export interface GoalChoice {
  goalId: string
  title: string
  category?: string | null
  horizon?: string | null
  status?: string | null
}

export interface GoalsSection {
  available: true
  goals: GoalChoice[]
}

export interface PracticeSection {
  available: true
  sessions: number
  latestAt: string | null
  latestBand: string | null
  byGoal: { goalId: string; sessions: number; latestAt: string | null; latestBand: string | null }[]
  note: string
}

export type SectionName = "identity" | "prism" | "fit" | "pathway" | "goals" | "practice"

export interface ProfileSections {
  identity?: IdentitySection
  prism?: PrismSection | Unavailable
  fit?: FitSection | Unavailable
  pathway?: PathwaySection | Unavailable
  goals?: GoalsSection | Unavailable
  practice?: PracticeSection | Unavailable
}

export interface ProfileContent {
  engineVersion?: string
  generatedAt?: string | null
  sections: ProfileSections
}

export interface Consent {
  version: string
  text: string
}

export interface Draft {
  profile: ProfileContent
  sectionOrder: SectionName[]
  defaultSections: SectionName[]
  consent: Consent
}

export interface Snapshot {
  id: string
  sections: SectionName[]
  content: ProfileContent
  approvedAt: string | null
  createdAt: string | null
}

export interface SnapshotRequest {
  sections: SectionName[]
  goalIds: string[]
  includeEmail: boolean
}

export interface Recipient {
  id: string
  organisation: string
  contactName: string
  isTest: boolean
}

export interface RecipientList {
  recipients: Recipient[]
  externalSharing: boolean
  consent: Consent
  limits: { defaultDays: number; maxDays: number; defaultOpens: number; maxOpens: number }
}

export interface ShareRequest {
  snapshotId: string
  recipientId: string
  consentVersion: string
  consentAccepted: boolean
  expiresInDays: number
  maxOpens: number
  allowDownload: boolean
}

export interface AccessEntry {
  outcome: string
  at: string | null
}

export interface Share {
  id: string
  snapshotId: string | null
  recipient: { organisation: string; contactName: string } | null
  createdAt: string | null
  expiresAt: string | null
  maxOpens: number
  opens: number
  allowDownload: boolean
  consentVersion: string
  revokedAt: string | null
  status: "live" | "revoked" | "expired" | "used_up"
  accessLog: AccessEntry[]
}

export interface OpenedProfile {
  profile: ProfileContent
  organisation: string
  expiresAt: string
  allowDownload: boolean
  viewKey: string | null
}

export type FileFormat = "docx" | "pdf"
