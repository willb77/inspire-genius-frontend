// Student Oversight Phase 1 — roster fetch.
//
// Calls the agent-engine DIRECTLY via `agentApi`. The monolith `api` instance
// would route this through CloudFront to a backend that has never heard of
// `/v1/agents/roster`, and the 404 would surface as an empty roster rather than
// as an error — indistinguishable from a manager with no direct reports.

import { agentApi } from "@/lib/agentApi"
import type { StudentRoster, StudentRosterRow } from "@/types/manager/studentRoster"

type Envelope<T> = { status?: boolean; data?: T }

/**
 * The caller's own direct reports, consent-gated by the backend.
 *
 * There is deliberately no `managerId` parameter. The backend resolves the
 * manager from the token; adding one here would be the client half of an
 * authorization bypass, and it would look like a perfectly ordinary argument.
 */
export async function getStudentRoster(): Promise<StudentRoster> {
  const res = await agentApi.get<Envelope<StudentRoster>>("/v1/agents/roster/students")
  const data = res.data?.data
  if (!data) {
    // An envelope with no data is a backend fault, not an empty roster. Saying
    // so here keeps the page from rendering a confident "no students".
    throw new Error("The roster service returned no data.")
  }
  return {
    students: Array.isArray(data.students) ? data.students : [],
    rosterEmptyReason: data.rosterEmptyReason ?? null,
    viewerProfileResolved: Boolean(data.viewerProfileResolved),
    counts: data.counts,
  }
}

/** Ask a student for specific categories. Requesting grants nothing. */
export async function requestStudentAccess(input: {
  studentUserId: string
  categories: Record<string, boolean>
  reason: string
}): Promise<void> {
  await agentApi.post("/v1/agents/consent/visibility/request", {
    studentUserId: input.studentUserId,
    categories: input.categories,
    reason: input.reason,
  })
}

export type { StudentRosterRow }
