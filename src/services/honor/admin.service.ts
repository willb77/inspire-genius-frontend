// The Honor Foundation — Coach Workbench: Administration service layer.
//
// Raw `agentApi` calls to the super-admin Administration API in the agent-engine
// (base `/v1/agents/honor/admin`). Every endpoint returns the Honor envelope
// `{ status, data }`; each function returns the unwrapped, normalized `data`.
//
// The backend is built-to-contract but pre-deploy, so responses are normalized
// tolerantly — snake_case OR camelCase keys — and reads never assume a field is
// present. When a route 404s (not deployed in this environment) the axios call
// rejects and the hook surfaces a graceful empty/error state; nothing crashes.

import { agentApi } from "@/lib/agentApi"
import type { HonorApiResponse } from "@/types/honor"
import type {
  AdminCoach,
  AdminCoachCreate,
  AdminFellow,
  AdminFellowCoach,
  AdminFellowUpdate,
  AdminImportResult,
  CareerArea,
  CareerAreaCreate,
  CareerAreaUpdate,
  CohortCreate,
  CohortDetail,
  CohortSummary,
  CohortUpdate,
} from "@/types/honor/admin"

const BASE = "/v1/agents/honor/admin"

/** A loose record used only to normalize a pre-deploy API's snake/camel keys. */
type Raw = Record<string, unknown>

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v)
}
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback
}
function pick(o: Raw, ...keys: string[]): unknown {
  for (const k of keys) if (o[k] != null) return o[k]
  return undefined
}
function arr(v: unknown): Raw[] {
  return Array.isArray(v) ? (v as Raw[]) : []
}

// ── Normalizers ──────────────────────────────────────────────────────────────

function normCoach(o: Raw): AdminCoach {
  return {
    sub: str(pick(o, "sub", "coach_sub", "coachSub", "id")),
    firstName: str(pick(o, "firstName", "first_name")),
    lastName: str(pick(o, "lastName", "last_name")),
    email: str(pick(o, "email")),
    role: str(pick(o, "role"), "coach"),
  }
}

/** A coach embedded in a fellow row — `{ sub, name, email }` (additive field). */
function normFellowCoach(o: Raw): AdminFellowCoach {
  const name = str(
    pick(o, "name", "fullName", "full_name") ??
      `${str(pick(o, "firstName", "first_name"))} ${str(pick(o, "lastName", "last_name"))}`.trim(),
  )
  return {
    sub: str(pick(o, "sub", "coach_sub", "coachSub", "id")),
    name: name || undefined,
    email: str(pick(o, "email")) || undefined,
  }
}

function normFellow(o: Raw): AdminFellow {
  return {
    id: str(pick(o, "id", "fellow_id", "fellowId")),
    firstName: str(pick(o, "firstName", "first_name")),
    lastName: str(pick(o, "lastName", "last_name")),
    email: str(pick(o, "email")),
    cohort: str(pick(o, "cohort", "cohort_name", "cohortName")),
    status: str(pick(o, "status"), "intake-pending"),
    coaches: arr(pick(o, "coaches")).map(normFellowCoach),
  }
}

function normCareerArea(o: Raw): CareerArea {
  const active = pick(o, "active", "is_active")
  return {
    id: str(pick(o, "id")),
    name: str(pick(o, "name")),
    active: active == null ? true : Boolean(active),
  }
}

function normCohort(o: Raw): CohortSummary {
  return {
    id: str(pick(o, "id", "cohort_id", "cohortId")),
    name: str(pick(o, "name")),
    description: (pick(o, "description") as string | null) ?? null,
    careerArea: (pick(o, "careerArea", "career_area") as string | null) ?? null,
    memberCount: num(pick(o, "memberCount", "member_count", "members_count")),
    coachCount: num(pick(o, "coachCount", "coach_count", "coaches_count")),
  }
}

function normCohortDetail(o: Raw): CohortDetail {
  return {
    ...normCohort(o),
    members: arr(pick(o, "members", "fellows")).map(normFellow),
    coaches: arr(pick(o, "coaches")).map(normCoach),
    // Counts fall back to the embedded list lengths when the API omits them.
    memberCount: num(pick(o, "memberCount", "member_count"), arr(pick(o, "members", "fellows")).length),
    coachCount: num(pick(o, "coachCount", "coach_count"), arr(pick(o, "coaches")).length),
  }
}

async function unwrap<T>(p: Promise<{ data: HonorApiResponse<unknown> }>, map: (raw: unknown) => T): Promise<T> {
  const { data } = await p
  return map(data.data)
}

// ── Cohorts ──────────────────────────────────────────────────────────────────

/**
 * Whoami — the caller's DB-resolved role + Honor-admin capability. Any
 * authenticated user may call it. Used to gate the Administration nav + route
 * on the authoritative backend role, since magic-link login tokens carry no
 * role and would otherwise hide the console from a genuine super-admin.
 */
export async function getAdminWhoami(): Promise<{ role: string; isHonorAdmin: boolean }> {
  return unwrap(
    agentApi.get<HonorApiResponse<unknown>>(`${BASE}/whoami`),
    (d) => {
      const o = (d ?? {}) as Raw
      return { role: str(o.role), isHonorAdmin: o.isHonorAdmin === true }
    },
  )
}

export async function listCohorts(): Promise<CohortSummary[]> {
  return unwrap(agentApi.get<HonorApiResponse<unknown>>(`${BASE}/cohorts`), (d) => arr(d).map(normCohort))
}

export async function getCohort(id: string): Promise<CohortDetail> {
  return unwrap(
    agentApi.get<HonorApiResponse<unknown>>(`${BASE}/cohorts/${encodeURIComponent(id)}`),
    (d) => normCohortDetail((d ?? {}) as Raw),
  )
}

export async function createCohort(input: CohortCreate): Promise<CohortSummary> {
  return unwrap(
    agentApi.post<HonorApiResponse<unknown>>(`${BASE}/cohorts`, input),
    (d) => normCohort((d ?? {}) as Raw),
  )
}

export async function updateCohort(id: string, input: CohortUpdate): Promise<CohortSummary> {
  return unwrap(
    agentApi.patch<HonorApiResponse<unknown>>(`${BASE}/cohorts/${encodeURIComponent(id)}`, input),
    (d) => normCohort((d ?? {}) as Raw),
  )
}

export async function deleteCohort(id: string): Promise<void> {
  await agentApi.delete<HonorApiResponse<unknown>>(`${BASE}/cohorts/${encodeURIComponent(id)}`)
}

// ── Career areas ─────────────────────────────────────────────────────────────

export async function listCareerAreas(): Promise<CareerArea[]> {
  return unwrap(agentApi.get<HonorApiResponse<unknown>>(`${BASE}/career-areas`), (d) => arr(d).map(normCareerArea))
}

export async function createCareerArea(input: CareerAreaCreate): Promise<CareerArea> {
  return unwrap(
    agentApi.post<HonorApiResponse<unknown>>(`${BASE}/career-areas`, input),
    (d) => normCareerArea((d ?? {}) as Raw),
  )
}

export async function updateCareerArea(id: string, input: CareerAreaUpdate): Promise<CareerArea> {
  return unwrap(
    agentApi.patch<HonorApiResponse<unknown>>(`${BASE}/career-areas/${encodeURIComponent(id)}`, input),
    (d) => normCareerArea((d ?? {}) as Raw),
  )
}

export async function deleteCareerArea(id: string): Promise<void> {
  await agentApi.delete<HonorApiResponse<unknown>>(`${BASE}/career-areas/${encodeURIComponent(id)}`)
}

// ── Coaches ──────────────────────────────────────────────────────────────────

export async function listCoaches(): Promise<AdminCoach[]> {
  return unwrap(agentApi.get<HonorApiResponse<unknown>>(`${BASE}/coaches`), (d) => arr(d).map(normCoach))
}

export async function createCoach(input: AdminCoachCreate): Promise<AdminCoach> {
  return unwrap(
    agentApi.post<HonorApiResponse<unknown>>(`${BASE}/coaches`, input),
    (d) => normCoach((d ?? {}) as Raw),
  )
}

export async function importCoaches(rows: Array<Record<string, string>>): Promise<AdminImportResult> {
  return unwrap(
    agentApi.post<HonorApiResponse<unknown>>(`${BASE}/coaches/import`, { rows }),
    (d) => normImportResult((d ?? {}) as Raw),
  )
}

export async function deleteCoach(coachSub: string): Promise<void> {
  await agentApi.delete<HonorApiResponse<unknown>>(`${BASE}/coaches/${encodeURIComponent(coachSub)}`)
}

// ── Fellows (ALL fellows) ────────────────────────────────────────────────────

export async function listFellows(): Promise<AdminFellow[]> {
  return unwrap(agentApi.get<HonorApiResponse<unknown>>(`${BASE}/fellows`), (d) => arr(d).map(normFellow))
}

export async function updateFellow(id: string, input: AdminFellowUpdate): Promise<AdminFellow> {
  return unwrap(
    agentApi.patch<HonorApiResponse<unknown>>(`${BASE}/fellows/${encodeURIComponent(id)}`, input),
    (d) => normFellow((d ?? {}) as Raw),
  )
}

export async function deleteFellow(id: string): Promise<void> {
  await agentApi.delete<HonorApiResponse<unknown>>(`${BASE}/fellows/${encodeURIComponent(id)}`)
}

/**
 * Fellow bulk import — reuses the LIVE coach students/import route
 * (`/v1/agents/honor/coach/students/import`), NOT an admin-only endpoint, so the
 * roster import works today even before the admin API deploys.
 */
export async function importFellows(rows: Array<Record<string, string>>): Promise<AdminImportResult> {
  return unwrap(
    agentApi.post<HonorApiResponse<unknown>>(`/v1/agents/honor/coach/students/import`, { rows }),
    (d) => normImportResult((d ?? {}) as Raw),
  )
}

// ── Assignments ──────────────────────────────────────────────────────────────

export async function assignFellow(cohortId: string, fellowId: string): Promise<void> {
  await agentApi.post<HonorApiResponse<unknown>>(
    `${BASE}/cohorts/${encodeURIComponent(cohortId)}/fellows`,
    { fellowId },
  )
}

export async function unassignFellow(cohortId: string, fellowId: string): Promise<void> {
  await agentApi.delete<HonorApiResponse<unknown>>(
    `${BASE}/cohorts/${encodeURIComponent(cohortId)}/fellows/${encodeURIComponent(fellowId)}`,
  )
}

export async function assignCoach(cohortId: string, coachSub: string): Promise<void> {
  await agentApi.post<HonorApiResponse<unknown>>(
    `${BASE}/cohorts/${encodeURIComponent(cohortId)}/coaches`,
    { coachSub },
  )
}

export async function unassignCoach(cohortId: string, coachSub: string): Promise<void> {
  await agentApi.delete<HonorApiResponse<unknown>>(
    `${BASE}/cohorts/${encodeURIComponent(cohortId)}/coaches/${encodeURIComponent(coachSub)}`,
  )
}

// ── Fellow ↔ coach ownership (admin-controlled, co-access allowed) ────────────

/** Normalize an assign/unassign response into the fellow's updated coach list. */
function normFellowCoachList(d: unknown): AdminFellowCoach[] {
  // The route may return the raw coach array, or the updated fellow object.
  const raw = Array.isArray(d) ? d : arr(pick((d ?? {}) as Raw, "coaches"))
  return raw.map(normFellowCoach)
}

/** Assign a coach to a fellow; returns the fellow's updated coach list. */
export async function assignFellowCoach(fellowId: string, coachSub: string): Promise<AdminFellowCoach[]> {
  return unwrap(
    agentApi.post<HonorApiResponse<unknown>>(
      `${BASE}/fellows/${encodeURIComponent(fellowId)}/coaches`,
      { coachSub },
    ),
    normFellowCoachList,
  )
}

/** Unassign a coach from a fellow; returns the fellow's updated coach list. */
export async function unassignFellowCoach(fellowId: string, coachSub: string): Promise<AdminFellowCoach[]> {
  return unwrap(
    agentApi.delete<HonorApiResponse<unknown>>(
      `${BASE}/fellows/${encodeURIComponent(fellowId)}/coaches/${encodeURIComponent(coachSub)}`,
    ),
    normFellowCoachList,
  )
}

// ── Shared import-result normalizer ──────────────────────────────────────────

function normImportResult(o: Raw): AdminImportResult {
  const results = arr(pick(o, "results")).map((r, i): AdminImportResult["results"][number] => {
    const status = str(pick(r, "status"), "created")
    return {
      row: num(pick(r, "row"), i + 1),
      status: (["created", "updated", "duplicate", "error"].includes(status)
        ? status
        : "created") as AdminImportResult["results"][number]["status"],
      name: pick(r, "name") as string | undefined,
      message: pick(r, "message") as string | undefined,
    }
  })
  const byStatus = (s: string) => results.filter((r) => r.status === s).length
  return {
    created: num(pick(o, "created", "added"), byStatus("created")),
    updated: num(pick(o, "updated"), byStatus("updated")),
    duplicates: num(pick(o, "duplicates", "skipped"), byStatus("duplicate")),
    errors: num(pick(o, "errors"), byStatus("error")),
    results,
  }
}
