/**
 * JF-9 — Career Pathway v2, as GET /v1/blueprint/fit/pathway?from=<job> sends
 * it when the server's job_fit_v2 switch applies to the caller. Absent `v2` is
 * the switch-off answer, and the page is then today's page.
 */

/** The marker the page keys off. */
export const PATHWAY_V2 = "pathway-v2"

export type PathwayRole = {
  jobId: string
  roleTitle: string
  roleFamily: string | null
  /** JF-3/JF-4 job level (from O*NET's Job Zone); null until loaded on the tier. */
  jobLevel: number | null
  socCode: string | null
  onetSocCode: string | null
  /** Mean benchmark difference from the origin job, 0-100 points. */
  distance: number | null
  rationale: string | null
}

/** Jobs, or — when there are none — why, as a code and a sentence. */
export type PathwaySection = {
  items: PathwayRole[]
  reason: string | null
  message: string | null
}

export type PathwayOrigin = {
  jobId: string
  roleTitle: string
  roleFamily: string | null
  jobLevel: number | null
  socCode: string | null
  onetSocCode: string | null
}

export type PathwayChoice = { jobId: string; roleTitle: string }

export type PathwayV2 = {
  version: typeof PATHWAY_V2 | string
  origin: PathwayOrigin | null
  originReason: string | null
  choices: PathwayChoice[]
  adjacent: PathwaySection
  nextLevel: PathwaySection
  newJobs: PathwaySection
  adjacentMaxDistance: number
}

/** OD-5 — CareerOneStop listings near the person (`/occupations/{code}/local/{kind}`). */
export type LocalKind = "training" | "licenses" | "certifications" | "apprenticeships"

export type LocalItem = {
  id?: string | null
  title: string
  organisation?: string | null
  location?: string | null
  credential?: string | null
  type?: string | null
  url?: string | null
}

export type LocalRead = {
  /** `off`: job_fit_v2 does not apply or the CareerOneStop key is not configured. */
  state: "ready" | "empty" | "off" | "unavailable"
  reason: string | null
  kind: string
  code: string
  source: string
  sourceUrl: string
  total: number | null
  data: LocalItem[]
}

/** CUR — a published school programme linked to a job's blueprint. */
export type LinkedProgram = {
  program: { id: string; code: string | null; title: string | null; credential: string | null }
  institution: { id: string; name: string | null }
}

export type BlueprintPrograms = {
  programs: LinkedProgram[]
  truncated: boolean
}
