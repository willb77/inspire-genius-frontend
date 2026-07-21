// The Honor Foundation — Coach Workbench: Administration console domain types.
//
// These model the super-admin Administration surface (cohorts, career areas,
// coaches, fellows, and their assignments). They target the agent-engine admin
// API under `/v1/agents/honor/admin` — built to the contract while the backend
// is pre-deploy, so the service layer normalizes tolerantly (snake OR camel) and
// every read has a graceful empty/error path.

// ── Career areas ─────────────────────────────────────────────────────────────

export type CareerArea = {
  id: string
  name: string
  active: boolean
}

export type CareerAreaCreate = { name: string }
export type CareerAreaUpdate = { name?: string; active?: boolean }

// ── Coaches (workbench coaches managed by an admin) ──────────────────────────

export type AdminCoach = {
  /** Canonical subject id (used as the delete key: DELETE /coaches/{coach_sub}). */
  sub: string
  firstName: string
  lastName: string
  email: string
  role: string
}

export type AdminCoachCreate = {
  first_name: string
  last_name: string
  email: string
  role?: string
}

/** One row of a coach bulk import. */
export type AdminCoachImportRow = {
  first_name: string
  last_name?: string
  email?: string
  role?: string
}

// ── Fellows (ALL fellows, admin-wide) ────────────────────────────────────────

/**
 * A coach assigned to a fellow (co-access is allowed — a fellow may have several).
 * Embedded in each admin fellow row by GET /admin/fellows and returned by the
 * assign/unassign coach routes. The API sends a single display `name` here (not
 * first/last), so both `name` and `email` are optional and read defensively.
 */
export type AdminFellowCoach = {
  sub: string
  name?: string
  email?: string
}

export type AdminFellow = {
  id: string
  firstName: string
  lastName: string
  email: string
  cohort: string
  status: string
  /** Coaches who own this fellow. Optional/additive — absent on older responses. */
  coaches?: AdminFellowCoach[]
}

export type AdminFellowUpdate = {
  first_name?: string
  last_name?: string
  email?: string
  cohort?: string
  cohort_id?: string
}

/** One row of a fellow bulk import (reuses the live coach students/import route). */
export type AdminFellowImportRow = {
  first_name: string
  last_name?: string
  email?: string
  cohort?: string
}

// ── Cohorts ──────────────────────────────────────────────────────────────────

export type CohortSummary = {
  id: string
  name: string
  description: string | null
  careerArea: string | null
  memberCount: number
  coachCount: number
}

/** Full detail: the cohort plus its assigned fellows and coaches. */
export type CohortDetail = CohortSummary & {
  members: AdminFellow[]
  coaches: AdminCoach[]
}

export type CohortCreate = {
  name: string
  description?: string
  career_area?: string
}

export type CohortUpdate = {
  name?: string
  description?: string
  career_area?: string
}

// ── Bulk-import result report ────────────────────────────────────────────────

export type ImportRowResult = {
  row: number
  status: "created" | "updated" | "duplicate" | "error"
  name?: string
  message?: string
}

export type AdminImportResult = {
  created: number
  updated: number
  duplicates: number
  errors: number
  results: ImportRowResult[]
}
