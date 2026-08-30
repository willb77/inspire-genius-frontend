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
  FafsaApplication,
  FafsaCompleteness,
  FafsaFieldCatalog,
  FafsaHandoff,
  FafsaPacket,
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

// ── FAFSA Application Concierge fixtures ─────────────────────────────────────

export const MOCK_FAFSA_APPLICATION: FafsaApplication = {
  application_id: "fafsa-mock-1",
  student_id: "me",
  award_year: "2026-27",
  status: "in_progress",
  sections: { first_name: "Alex", last_name: "Rivera", household_size: 4, is_married: false },
  contributors: {},
  handoff: {},
  packet: {},
  submitted: false,
  confirmation_number: null,
}

export const MOCK_FAFSA_FIELD_CATALOG: FafsaFieldCatalog = {
  sections: [
    {
      key: "student_identity",
      title: "About You",
      description: "Pre-filled from your profile so you just confirm.",
      handoff: false,
      fields: [
        { key: "first_name", label: "First name", type: "text", required: true, ddx: false, sensitive: false, collectable: true, prefillSource: "first_name", help: "", options: [] },
        { key: "last_name", label: "Last name", type: "text", required: true, ddx: false, sensitive: false, collectable: true, prefillSource: "last_name", help: "", options: [] },
        { key: "ssn", label: "Social Security Number", type: "text", required: true, ddx: false, sensitive: true, collectable: false, prefillSource: null, help: "Entered by you directly on StudentAid.gov. GRANT never sees or stores your SSN.", options: [] },
      ],
    },
    {
      key: "family",
      title: "Family & Household",
      description: "Carries over year to year.",
      handoff: false,
      fields: [
        { key: "household_size", label: "People in your household", type: "number", required: true, ddx: false, sensitive: false, collectable: true, prefillSource: "household_size", help: "", options: [] },
      ],
    },
    {
      key: "tax_information",
      title: "Tax Information",
      description: "Auto-filled from the IRS when you consent.",
      handoff: false,
      fields: [
        { key: "adjusted_gross_income", label: "Adjusted gross income", type: "number", required: false, ddx: true, sensitive: false, collectable: false, prefillSource: null, help: "Transferred from the IRS when you consent. Never entered here.", options: [] },
      ],
    },
  ],
}

export const MOCK_FAFSA_COMPLETENESS: FafsaCompleteness = {
  awardYear: "2026-27",
  percentComplete: 45,
  requiredTotal: 11,
  requiredComplete: 5,
  missingRequired: ["citizenship_status", "cash_savings_checking", "school_codes"],
  ready: false,
  sections: [
    { key: "student_identity", title: "About You", requiredTotal: 3, requiredComplete: 3, complete: true },
    { key: "family", title: "Family & Household", requiredTotal: 2, requiredComplete: 1, complete: false },
  ],
}

export const MOCK_FAFSA_PACKET: FafsaPacket = {
  awardYear: "2026-27",
  ready: false,
  counts: { collected: 4, prefilled: 4, missing: 3, missingRequired: 3 },
  sections: [],
  summary: [
    "FAFSA 2026-27 prep packet.",
    "4 field(s) pre-filled from your profile, 4 you've completed.",
    "3 required field(s) still need an answer before your packet is submission-ready.",
  ],
  disclaimer:
    "This packet stages your non-tax answers so you can confirm them on StudentAid.gov. Your tax information transfers directly from the IRS when you consent, and your SSN is entered by you on the official site — GRANT never stores either. GRANT never submits your FAFSA for you.",
}

export const MOCK_FAFSA_HANDOFF: FafsaHandoff = {
  awardYear: "2026-27",
  contributors: [
    { role: "student", label: "You" },
    { role: "parent1", label: "Your parent" },
  ],
  steps: [
    { id: "fsa_id_student", title: "Create an FSA ID — You", description: "Create a StudentAid.gov account. Allow 1–3 days to verify.", deepLink: "https://studentaid.gov/fsa-id/create-account/launch", status: "complete", contributor: "student" },
    { id: "fsa_id_parent1", title: "Create an FSA ID — Your parent", description: "Your parent creates a StudentAid.gov account.", deepLink: "https://studentaid.gov/fsa-id/create-account/launch", status: "pending", contributor: "parent1" },
    { id: "start_form", title: "Start your FAFSA form", description: "Open the FAFSA for your award year.", deepLink: "https://studentaid.gov/apply-for-aid/fafsa/filling-out", status: "pending" },
    { id: "consent_student", title: "Consent to the IRS tax transfer — You", description: "The step that auto-fills the tax section.", deepLink: "https://studentaid.gov/help/consent-fdx", status: "pending", contributor: "student" },
    { id: "submit", title: "Submit your FAFSA", description: "Only you can do this — GRANT never submits on your behalf.", deepLink: "https://studentaid.gov/apply-for-aid/fafsa/filling-out", status: "pending" },
  ],
  counts: { total: 5, complete: 1, remaining: 4 },
  complete: false,
}
