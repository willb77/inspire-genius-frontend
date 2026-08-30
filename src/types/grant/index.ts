// GRANT financial-aid vertical — domain types
// These model the Section-4 endpoint payloads consumed by the GRANT tools.
// Kept intentionally explicit (no `any`) so UI-1..7 can build against them.

// Aid-intake contract (UI-1) — trigger + enrichment fields, zod schema, helpers.
export * from "./intake"

// ── Vertical Core types, re-exported under GRANT's names ─────────────────────
// These are not GRANT's to define — they are the vertical contract, owned by
// `@/verticals/core`. Aliased here so GRANT's services keep reading naturally
// (`GrantApiResponse<Deadline[]>`). New code may import either name.

export type {
  MeProfile,
  UserPreferences,
  VerticalApiResponse,
} from "@/verticals/core"
import type { VerticalApiResponse, VerticalKey } from "@/verticals/core"

/** Vertical identifiers that gate feature access. @see VerticalKey */
export type KnownVertical = VerticalKey

/** Envelope every GRANT service returns. @see VerticalApiResponse */
export type GrantApiResponse<T = unknown> = VerticalApiResponse<T>

// ── Financial Profile (Section 4: GET /v1/students/{id}) ─────────────────────

export type DependencyStatus = "dependent" | "independent" | "unknown"
export type EnrollmentStatus = "full-time" | "part-time" | "less-than-half" | "unknown"

export type StudentProfile = {
  id: string
  fullName: string
  email: string
  stateOfResidence: string
  dependencyStatus: DependencyStatus
  enrollmentStatus: EnrollmentStatus
  householdIncome: number
  /** Student Aid Index (formerly EFC). */
  studentAidIndex: number
  gpa: number
  expectedGraduationYear: number
}

// ── Deadlines (Section 4: GET /v1/deadlines) ─────────────────────────────────

export type DeadlineType = "federal" | "state" | "institutional" | "scholarship"
export type DeadlineStatus = "upcoming" | "due-soon" | "overdue" | "submitted"

export type Deadline = {
  id: string
  name: string
  type: DeadlineType
  /** ISO-8601 date. */
  dueDate: string
  status: DeadlineStatus
  institution?: string
}

// ── Scholarships (Section 4: GET /v1/scholarships) ───────────────────────────

export type Scholarship = {
  id: string
  name: string
  provider: string
  amount: number
  /** ISO-8601 date. */
  deadline: string
  /** 0–100 relevance score against the student profile. */
  matchScore: number
  url: string
  eligibilitySummary: string
}

export type ScholarshipQuery = {
  query?: string
  minAmount?: number
  page?: number
  pageSize?: number
}

// ── Net Price (Section 4: POST /v1/net-price) ────────────────────────────────

export type NetPriceRequest = {
  institutionId: string
  householdIncome: number
  dependencyStatus: DependencyStatus
  stateOfResidence: string
}

export type NetPriceEstimate = {
  institutionId: string
  institutionName: string
  costOfAttendance: number
  estimatedGrantAid: number
  netPrice: number
}

// ── Award Letters (Section 4: GET /v1/award-letters) ─────────────────────────

export type AwardLetter = {
  id: string
  institutionName: string
  costOfAttendance: number
  grants: number
  scholarships: number
  workStudy: number
  federalLoans: number
  /** COA minus gift aid (grants + scholarships). */
  netCost: number
}

// ── Loans & Repayment (Section 4: POST /v1/calculate-repayment) ──────────────

export type RepaymentPlanType = "standard" | "graduated" | "income-driven"

export type RepaymentRequest = {
  principal: number
  /** Annual interest rate as a percentage, e.g. 5.5. */
  annualRatePct: number
  termMonths: number
  plan: RepaymentPlanType
}

export type RepaymentEstimate = {
  monthlyPayment: number
  totalPaid: number
  totalInterest: number
  plan: RepaymentPlanType
}

// ── Salary Lookup (Section 4: GET /v1/salary-lookup) ─────────────────────────

export type SalaryLookup = {
  occupation: string
  medianAnnualSalary: number
  entryLevelSalary: number
  /** Projected 10-year growth as a percentage. */
  projectedGrowthPct: number
}

// ── Web Search (Section 4: POST /v1/web-search) ──────────────────────────────

export type WebSearchRequest = {
  query: string
  maxResults?: number
}

export type WebSearchResult = {
  title: string
  url: string
  snippet: string
}

// ── FAFSA Application Concierge (/v1/agents/grant/fafsa/*) ────────────────────
// The collect → validate → prep-packet → guided-handoff flow. The backend never
// stores tax figures (auto-filled from the IRS on FA-DDX consent) or the SSN
// (entered on StudentAid.gov) — those fields are surfaced read-only, never as
// inputs.

export type FafsaFieldType =
  | "text"
  | "date"
  | "select"
  | "number"
  | "boolean"
  | "school_list"

export type FafsaField = {
  key: string
  label: string
  type: FafsaFieldType
  required: boolean
  /** Filled by the IRS↔ED exchange on consent; never collected. */
  ddx: boolean
  /** Entered by the student directly on StudentAid.gov (SSN); never stored. */
  sensitive: boolean
  /** True when GRANT may collect + store this field (not ddx, not sensitive). */
  collectable: boolean
  prefillSource: string | null
  help: string
  options: string[]
}

export type FafsaSection = {
  key: string
  title: string
  description: string
  /** Handoff sections are the federally-irreducible StudentAid.gov steps. */
  handoff: boolean
  fields: FafsaField[]
}

export type FafsaFieldCatalog = {
  sections: FafsaSection[]
}

export type FafsaStatus = "draft" | "in_progress" | "packet_ready" | "submitted"

export type FafsaApplication = {
  application_id: string
  student_id: string
  award_year: string
  status: FafsaStatus
  sections: Record<string, unknown>
  contributors: Record<string, unknown>
  handoff: Record<string, unknown>
  packet: Record<string, unknown>
  submitted: boolean
  confirmation_number: string | null
}

export type FafsaSectionCompleteness = {
  key: string
  title: string
  requiredTotal: number
  requiredComplete: number
  complete: boolean
}

export type FafsaCompleteness = {
  awardYear: string
  percentComplete: number
  requiredTotal: number
  requiredComplete: number
  missingRequired: string[]
  ready: boolean
  sections: FafsaSectionCompleteness[]
}

export type FafsaPacketField = {
  key: string
  label: string
  value: unknown
  source:
    | "collected"
    | "prefilled"
    | "missing"
    | "auto_fill_on_consent"
    | "entered_on_studentaid"
  required?: boolean
  prefillSource?: string
}

export type FafsaPacketSection = {
  key: string
  title: string
  handoff: boolean
  fields: FafsaPacketField[]
}

export type FafsaPacket = {
  awardYear: string
  ready: boolean
  counts: { collected: number; prefilled: number; missing: number; missingRequired: number }
  sections: FafsaPacketSection[]
  summary: string[]
  disclaimer: string
}

export type FafsaContributor = { role: string; label: string }

export type FafsaHandoffStep = {
  id: string
  title: string
  description: string
  deepLink: string
  status: "pending" | "complete"
  contributor?: string
}

export type FafsaHandoff = {
  awardYear: string | null
  contributors: FafsaContributor[]
  steps: FafsaHandoffStep[]
  counts: { total: number; complete: number; remaining: number }
  complete: boolean
}
