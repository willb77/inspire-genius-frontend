/**
 * School curriculum (CUR-1 API, CUR-2 admin screens).
 *
 * Mirrors the shapes returned by the agent-engine routes under
 * `/v1/agents/career-discovery/curriculum/*`. The server owns every rule
 * (field checks, unknown codes, cycles, credit totals); these types only
 * describe what comes back.
 */

export type CatalogStatus = "draft" | "published" | "superseded"
export type RequisiteKind = "prereq" | "coreq"
export type RequirementRule = "required" | "choose_n" | "min_credits"

export const CREDENTIALS = [
  "AAS",
  "AA",
  "AS",
  "AFA",
  "AGE",
  "BA",
  "BS",
  "certificate",
  "diploma",
  "other",
] as const
export const TERMS = ["fall", "spring", "summer", "winter"] as const
export const RULES: readonly RequirementRule[] = ["required", "choose_n", "min_credits"]

export type CurriculumStatus = {
  enabled: boolean
  tablesReady: boolean
}

export type Institution = {
  id: string
  name: string
  unitid: string | null
  opeid: string | null
  orgId: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type Catalog = {
  id: string
  institutionId: string
  catalogYear: string
  version: number
  status: CatalogStatus
  publishedAt: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type Requisite = {
  code: string
  kind: RequisiteKind
  altGroup: number
  minGrade: string | null
}

export type Course = {
  id?: string
  code: string
  title: string
  credits: number
  description: string | null
  termsOffered: string[]
  prerequisites: Requisite[]
}

export type RequirementGroup = {
  groupName: string
  rule: RequirementRule
  n: number | null
  minCredits: number | null
  courses: string[]
  position: number
}

export type Program = {
  id?: string
  code: string
  title: string
  credential: string
  totalCredits: number
  cipCode: string | null
  description: string | null
  requirements: RequirementGroup[]
  outcomes?: unknown[]
}

export type ReportError = { file: string | null; row: number | null; message: string }
export type UnknownCode = { code: string; row: number | null; file: string; referencedBy: string }
export type CreditSummary = {
  program: string
  declared: number | null
  requiredCredits: number
  minimumToComplete: number
  matches: boolean
}

/** The report a dry run returns, and an import or publish refuses with. */
export type CurriculumReport = {
  ok: boolean
  counts: {
    courses: number
    programs: number
    requirementGroups: number
    prerequisiteLinks: number
  }
  errors: ReportError[]
  unknownCodes: UnknownCode[]
  cycles: string[][]
  credits: CreditSummary[]
  warnings: string[]
}

export type CatalogDetail = {
  catalog: Catalog
  courses: Course[]
  programs: Program[]
  publishCheck: CurriculumReport
}

export type ImportResult = {
  dryRun: boolean
  written: boolean
  report: CurriculumReport
}

export type InstitutionInput = {
  name: string
  unitid?: string | null
  opeid?: string | null
  orgId?: string | null
}

export type CourseInput = {
  code: string
  title: string
  credits: number
  description?: string | null
  termsOffered: string[]
  prerequisites: { code: string; kind: RequisiteKind; altGroup?: number | null; minGrade?: string | null }[]
}

export type ProgramInput = {
  code: string
  title: string
  credential: string
  totalCredits: number
  cipCode?: string | null
  description?: string | null
  requirements: {
    groupName: string
    rule: RequirementRule
    n?: number | null
    minCredits?: number | null
    courses: string[]
  }[]
}

export type ImportInput = {
  coursesCsv: string
  programsCsv: string
  dryRun: boolean
}
