// N-4 — Job DNA external validation (employer / SME sign-off) and the Rationale Report.
// Mirrors blueprint-service app/validation.py (camelCase JSON).

/** Derived from the latest event on ONE active version. Never a value of JobDNA.status. */
export type ValidationState = "none" | "in_review" | "validated" | "changes_requested" | "withdrawn"

export type ValidationEvent = {
  id: string
  event: "requested" | "validated" | "changes_requested" | "withdrawn"
  /** "in-app": a manager in the role's org signed in IG; "recorded": an editor recorded an SME's attestation. */
  method: "in-app" | "recorded" | null
  at: string
  actorName: string
  reviewerName: string | null
  validatorName: string | null
  validatorOrg: string | null
  validatorTitle: string | null
  validatedOn: string | null
  comments: string | null
  dimensionNotes: Record<string, string>
  /** A recorded attestation's validator fields passed the 90-day retention and are no longer held. */
  retentionApplied: boolean
}

export type BlueprintValidation = {
  blueprintId: string
  version: number
  eligible: boolean
  ineligibleReason: string | null
  state: ValidationState
  current: ValidationEvent | null
  reviewerName: string | null
  awaitingYou: boolean
  requestedByYou: boolean
  history: ValidationEvent[]
  retentionDays: number
}

export type ValidationStatus = { enabled: boolean; reviewerRole: string; retentionDays: number }

export type AwaitingValidation = {
  blueprintId: string
  roleTitle: string
  version: number
  requestedBy: string
  requestedAt: string
  note: string | null
}

export type ValidationRequestBody = { reviewerEmail: string; note?: string }

export type ValidationVerdictBody = {
  verdict: "validated" | "changes_requested"
  name?: string
  org?: string
  title?: string
  comments?: string
  dimensionNotes?: Record<string, string>
}

export type ValidationRecordBody = {
  name: string
  org: string
  title?: string
  validatedOn: string
  comments?: string
  dimensionNotes?: Record<string, string>
  attest: boolean
}

export type RationaleDimension = {
  category: "behavior" | "aptitude" | "core-trait"
  categoryLabel: string
  dimensionId: number
  dimensionName: string
  rankPosition: number | null
  rateValue: number | null
  maxRate: number
  targetPercent: number
  importanceTier: string
  interpretation: string
  method: string
  competencies: string[]
  smeNote: string | null
  recordedEvidence: string
}

export type RationaleReport = {
  generatedAt: string
  role: {
    id: string
    roleTitle: string
    department: string
    tier: string
    version: number
    status: string
    supersedesVersion: number | null
    createdAt: string
    publishedAt: string | null
  }
  validation: {
    state: ValidationState
    statement: string | null
    validatedBy: string | null
    current: ValidationEvent | null
    history: ValidationEvent[]
    retentionDays: number
  }
  provenance: {
    benchmarkSource: string
    benchmarkSourceLabel: string
    sourceRef: string | null
    internalReviewer: string
    reviewedAt: string | null
  }
  dimensions: RationaleDimension[]
  evidence: {
    criticalActivities: string[]
    kpis: string[]
    keyInteractions: string[]
    workPressures: string[]
    requiredWorkStyles: string[]
    environmentalFactors: string[]
    culturalFactors: string[]
    perDimension: string
  }
  ugesp: {
    section: string
    jobAnalysis: string
    version: number
    publishedBy: string
    publishedAt: string | null
    validatedBy: string
    workBehaviours: string
  }
  limits: string[]
}
