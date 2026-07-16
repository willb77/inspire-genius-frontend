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
