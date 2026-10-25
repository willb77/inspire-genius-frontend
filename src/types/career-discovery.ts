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
  /** DISC-2: present only when Education paths is switched on. */
  educationPaths?: { careerArea: string; field: string; credential: string }[]
}

// ─── DISC-2: Education paths ─────────────────────────────────────────────

export type EducationCredential = { level: number; title: string }

export type EducationPath = {
  id: string
  careerArea: string
  areaRank: number
  fit: number | null
  occupations: { soc: string; title: string; typicalEntry: string }[]
  credentials: EducationCredential[]
  field: { cip: string; code: string; title: string }
  why: string
  notes: string[]
}

export type DiscoveryEducation = {
  areas: { careerArea: string; fit: number | null }[]
  paths: EducationPath[]
  note: string | null
  crosswalkSource: string
  entrySource: string
  schoolsSource: string
  /** DISC-4: present (true) only when the server offers a school's own programs. */
  programsAvailable?: boolean
}

export type EducationSchool = {
  id: number | null
  name: string
  city: string | null
  state: string | null
  url: string | null
  program: { title: string | null; credential: string | null }
}

export type SchoolsQuery = { cip: string; level: number; state: string }

export type DiscoverySchools = SchoolsQuery & {
  page: number
  perPage: number
  source: string
  schools: EducationSchool[]
  total: number | null
  unavailable: boolean
  note: string | null
}

/** DISC-3: one school's program, as picked from an Education paths school list. */
export type CostQuery = { cip: string; level: number; school: number }

export type CostRange = { low: number; high: number }

/** DISC-3: Cost and payback. Every figure is computed by the server; none here. */
export type DiscoveryCost = {
  cip: string
  code: string
  level: number
  schoolId: number
  unavailable: boolean
  note: string | null
  field?: string
  credential?: string
  school?: { id: number | null; name: string | null; priceCalculatorUrl: string | null } | null
  netPrice?: (CostRange & {
    average: number
    byIncome: { band: string; amount: number }[]
    source: string
    note: string
  }) | null
  yearsToComplete?: (CostRange & { source: string }) | null
  totalCost?: (CostRange & { average: number; basis: string }) | null
  earnings?: {
    basis: "program" | "market"
    early: number
    later: number
    earlyYearsAfter: number | null
    laterYearsAfter: number | null
    approximation: boolean
    source: string
    label: string | null
    occupations?: { soc: string; title: string }[]
  } | null
  baseline?: { annual: number; source: string }
  payback?: {
    low: number | null
    high: number | null
    unit: "years"
    reachable: boolean
    highUnreachable: boolean
    basis: string
    note: string
  } | null
  statement?: string | null
  missing?: string[]
  missingStatements?: string[]
  computable?: boolean
  aid?: {
    grant: { vertical: string; path: string; label: string }
    studentAid: string
    netPriceCalculator: string | null
  }
}

/** Two-letter codes the server accepts (app/tools/career_discovery/education.py US_STATES). */
export const US_STATES: { value: string; label: string }[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"],
  ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
  ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
  ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"],
  ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"],
  ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"], ["AS", "American Samoa"],
  ["GU", "Guam"], ["MP", "Northern Mariana Islands"], ["PR", "Puerto Rico"],
  ["VI", "U.S. Virgin Islands"], ["FM", "Micronesia"], ["MH", "Marshall Islands"], ["PW", "Palau"],
].map(([value, label]) => ({ value, label }))

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

// ─── DISC-4: Programs at your school ─────────────────────────────────────

export type ProgramSchool = { id: string; name: string; suggested: boolean }

export type DiscoveryProgramSchools = {
  available: boolean
  schools: ProgramSchool[]
  chosenSchoolId: string | null
  note: string | null
}

/** One component of a suggestion. Only `scored` carries a number; anything else says why. */
export type ProgramComponent = {
  status: string
  score?: number
  reason?: string
  family?: string
  role?: { id: string; title: string | null }
  used?: string[]
  missing?: string[]
  goalFamilies?: string[]
  matched?: string[]
}

export type ProgramCard = {
  id: string
  code: string
  title: string
  credential: string | null
  totalCredits: number | null
  careers: { roleFamily: string | null; role: { id: string; title: string | null } | null; socCode: string | null }[]
  components: { fit: ProgramComponent; affinity: ProgramComponent; goal: ProgramComponent }
  score: number | null
  rank: number | null
  why: string
  note: string | null
}

export type DiscoveryProgramsFallback = {
  mode: "public_paths"
  reason: string
  note: string
  school: { id: string; name: string | null } | null
}

/**
 * CURU-F1: the saved choice was made on an older version of the same catalog
 * and was carried to the newest by course and program code. Present only then.
 */
export type CarriedForward = {
  fromCatalog: { id: string; catalogYear: string; version: number }
  toCatalog: { id: string; catalogYear: string; version: number }
  programsNotCarried: string[]
  coursesNotCarried: string[]
  note: string
}

export type DiscoveryProgramsCatalog = {
  mode: "catalog"
  school: { id: string; name: string | null }
  catalog: { id: string; catalogYear: string; version: number }
  programs: ProgramCard[]
  weights: Record<string, number>
  engineVersion: string
  fit: { available: boolean; state: string; asOf: string | null; reason: string | null }
  chosenProgramId: string | null
  socCodeNote: string
  carriedForward?: CarriedForward
}

export type DiscoveryPrograms = DiscoveryProgramsCatalog | DiscoveryProgramsFallback

/** What the server saves: ids only. */
export type ProgramChoice = { schoolId: string; programId?: string | null }
export type SavedProgramChoice = { saved: { schoolId: string; catalogId: string; programId: string | null } }

// ─── DISC-5: Degree plan ─────────────────────────────────────────────────

export type PlanSeason = "fall" | "spring" | "summer"
export type PlanLoad = "full_time" | "part_time"
export type PlanTermRef = { season: PlanSeason; year: number }

export type PlanCourse = {
  id: string | null
  code: string
  title: string | null
  credits: number
  whyNow: string
  satisfies: string[]
  after: string[]
  alreadyDone: string[]
  with: string[]
  unlocks: string[]
  offered: string[] | null
  anyTerm: boolean
  minGrades: string[]
}

export type PlanTerm = {
  season: PlanSeason
  year: number
  label: string
  credits: number
  overLoad: boolean
  note: string | null
  courses: PlanCourse[]
}

export type PlanRefusal = { code: string; names: string[]; statement: string }

export type PlanProgram = {
  id: string | null
  code: string | null
  title: string | null
  credential: string | null
  totalCredits: number | null
  requirementsMinimum: number
  openElectiveCredits: number | null
}

/** The engine's answer: a plan, or a refusal that names what stopped it. */
export type DegreePlanResult = {
  engineVersion: string
  load: { kind: PlanLoad; creditsPerTerm: number; min: number; max: number; default: number }
  start: PlanTermRef & { label: string }
  summer: boolean
  refused: PlanRefusal | null
  programs?: PlanProgram[]
  terms?: PlanTerm[]
  termsLeft?: number
  creditsDone?: number
  creditsLeft?: number
  completedCounted?: string[]
  completedNotCounted?: string[]
  expectedCompletion?: (PlanTermRef & { label: string }) | null
  alreadyComplete?: boolean
  notes?: string[]
}

export type PlanCareer = {
  program: string | null
  roleFamily: string | null
  socCode: string | null
  role: { id: string; title: string | null } | null
  overallFit: number | null
  prismFit: number | null
  fitMissing: string[]
}

export type CostToFinish =
  | {
      available: true
      terms: number
      low: number
      high: number
      perTerm?: { low: number; high: number }
      basis?: string
      source?: string | null
      note?: string | null
      program?: string | null
    }
  | { available: false; reason: string; note: string | null; missingStatements: string[] }

export type PlanGaps =
  | {
      available: true
      targetRole: { title?: string | null } | null
      targetRolePending: boolean
      gapsPending: boolean
      counts: Record<string, number> | null
      items: { title: string | null; competency: string | null; severity: string | null; costable: boolean }[]
      note: string | null
    }
  | { available: false; note: string }

export type ChecklistCourse = { id: string; code: string; title: string; credits: number | null; completed: boolean }

export type DegreePlanInputs = {
  programIds: string[]
  load: PlanLoad
  creditsPerTerm: number
  startTerm: PlanTermRef
  summer: boolean
  droppedCompleted: number
}

export type DegreePlanReady = {
  available: true
  reason: null
  note: null
  school: { id: string }
  catalog: { id: string; catalogYear: string; version: number }
  inputs: DegreePlanInputs
  options: {
    loads: Record<PlanLoad, { min: number; max: number; default: number }>
    maxExtraPrograms: number
    programs: { id: string; code: string; title: string; credential: string | null }[]
  }
  checklist: ChecklistCourse[]
  plan: DegreePlanResult
  careers: PlanCareer[]
  fit: { available: boolean; state: string; asOf: string | null; reason: string | null }
  costToFinish: CostToFinish
  gaps: PlanGaps
  socCodeNote: string
  carriedForward?: CarriedForward
}

/** No plan yet: catalogs can't be read, no program chosen, or the catalog moved on. */
export type DegreePlanPending = {
  available: boolean
  reason: string
  note: string
  plan: null
  carriedForward?: CarriedForward
}

export type DegreePlan = DegreePlanReady | DegreePlanPending

/** What the person sends: ids and settings only. */
export type DegreePlanInputsBody = {
  completedCourseIds: string[]
  load: PlanLoad
  creditsPerTerm: number | null
  startTerm: PlanTermRef
  summer: boolean
  extraProgramIds: string[]
}

export type SavedDegreePlanInputs = {
  saved: {
    catalogId: string
    programIds: string[]
    completedCourseIds: string[]
    load: PlanLoad
    creditsPerTerm: number
    startTerm: PlanTermRef
    summer: boolean
  }
}
