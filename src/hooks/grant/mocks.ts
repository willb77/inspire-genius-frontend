// GRANT vertical — TYPED MOCK fixtures (UI-0).
//
// These back the React Query hooks until the Section-4 endpoints are live so
// UI-1..7 can render real-looking data. Each hook references `USE_GRANT_MOCKS`;
// flip it to `false` (or delete the branch) once the endpoint is wired.
//
// NOTE: This is mock data only — do NOT ship as production truth.

import type {
  AwardLetter,
  Deadline,
  NetPriceEstimate,
  RepaymentEstimate,
  SalaryLookup,
  Scholarship,
  StudentProfile,
  WebSearchResult,
} from "@/types/grant"

/** Master switch for the GRANT mock data layer.
 *
 * Dev go-live (2026-07-12): flipped to `false` — GRANT now reads the live
 * `/v1/agents/grant/*` endpoints (reachability + entitlements verified on dev).
 * Live: aid-intake round-trip, student profile, FAFSA/state deadlines (seeded
 * in-memory repo), loan repayment, salary lookup. Empty until their API-key
 * secrets are provisioned: scholarship search (`ig/grant/tavily`) and net-price
 * (`ig/grant/college_scorecard`). The MOCK_* fixtures below are retained for
 * local dev / tests. Set back to `true` to restore the fixture demo. */
export const USE_GRANT_MOCKS = false

export const MOCK_STUDENT_PROFILE: StudentProfile = {
  id: "me",
  fullName: "Alex Rivera",
  email: "alex.rivera@example.edu",
  stateOfResidence: "CA",
  dependencyStatus: "dependent",
  enrollmentStatus: "full-time",
  householdIncome: 62000,
  studentAidIndex: 4200,
  gpa: 3.6,
  expectedGraduationYear: 2028,
}

export const MOCK_DEADLINES: Deadline[] = [
  { id: "d1", name: "FAFSA Submission", type: "federal", dueDate: "2026-06-30", status: "due-soon" },
  { id: "d2", name: "Cal Grant GPA Verification", type: "state", dueDate: "2026-09-02", status: "upcoming" },
  { id: "d3", name: "CSS Profile", type: "institutional", dueDate: "2026-07-15", status: "upcoming", institution: "Stanford" },
]

export const MOCK_SCHOLARSHIPS: Scholarship[] = [
  { id: "s1", name: "Horizon STEM Award", provider: "Horizon Foundation", amount: 5000, deadline: "2026-08-01", matchScore: 92, url: "https://example.org/horizon", eligibilitySummary: "STEM majors, GPA 3.5+" },
  { id: "s2", name: "First-Gen Leaders Grant", provider: "Access Fund", amount: 2500, deadline: "2026-08-20", matchScore: 84, url: "https://example.org/first-gen", eligibilitySummary: "First-generation college students" },
]

export const MOCK_NET_PRICE: NetPriceEstimate = {
  institutionId: "inst-1",
  institutionName: "State University",
  costOfAttendance: 34000,
  estimatedGrantAid: 18500,
  netPrice: 15500,
}

export const MOCK_AWARD_LETTERS: AwardLetter[] = [
  { id: "a1", institutionName: "State University", costOfAttendance: 34000, grants: 12000, scholarships: 6500, workStudy: 2500, federalLoans: 5500, netCost: 15500 },
  { id: "a2", institutionName: "City College", costOfAttendance: 21000, grants: 9000, scholarships: 3000, workStudy: 1500, federalLoans: 3500, netCost: 9000 },
]

export const MOCK_REPAYMENT: RepaymentEstimate = {
  monthlyPayment: 212.4,
  totalPaid: 25488,
  totalInterest: 5488,
  plan: "standard",
}

export const MOCK_SALARY: SalaryLookup = {
  occupation: "Software Developer",
  medianAnnualSalary: 124200,
  entryLevelSalary: 78000,
  projectedGrowthPct: 17,
}

export const MOCK_WEB_SEARCH: WebSearchResult[] = [
  { title: "Federal Student Aid — Types of Aid", url: "https://studentaid.gov/understand-aid/types", snippet: "Grants, loans, and work-study overview from the U.S. Dept. of Education." },
  { title: "How the Student Aid Index works", url: "https://example.org/sai", snippet: "The SAI replaced the EFC for the 2024–25 award year." },
]
