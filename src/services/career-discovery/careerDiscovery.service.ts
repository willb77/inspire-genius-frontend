import { agentApi } from "@/lib/agentApi"
import type { VerticalApiResponse } from "@/verticals/core"
import type {
  CostQuery,
  DiscoveryAlignment,
  DiscoveryCareers,
  DiscoveryCost,
  DiscoveryEducation,
  DiscoveryGoals,
  DiscoveryJob,
  DiscoveryJourney,
  DiscoveryPays,
  DiscoveryPlan,
  DiscoverySchools,
  DiscoveryStatus,
  SchoolsQuery,
} from "@/types/career-discovery"
import type { SelfPortrait } from "@/types/lumen"

// Discovery's routes live on the Agent Engine at /v1/agents/career-discovery —
// the only prefix API Gateway routes there — so they go through `agentApi`.
const PREFIX = "/v1/agents/career-discovery"

async function get<T>(path: string) {
  const { data } = await agentApi.get<VerticalApiResponse<T>>(`${PREFIX}${path}`)
  return data
}

export const getDiscoveryStatus = () => get<DiscoveryStatus>("/status")
export const getDiscoveryJourney = () => get<DiscoveryJourney>("/journey")
export const getDiscoveryPortrait = () => get<SelfPortrait>("/portrait")
export const getDiscoveryCareers = () => get<DiscoveryCareers>("/careers")
export const getDiscoveryPays = () => get<DiscoveryPays>("/salaries")
export const getDiscoveryGoals = () => get<DiscoveryGoals>("/goals")
export const getDiscoveryAlignment = () => get<DiscoveryAlignment>("/alignment")
export const getDiscoveryAlignmentJob = (jobId: string) =>
  get<DiscoveryJob>(`/alignment/jobs/${encodeURIComponent(jobId)}`)
export const getDiscoveryPlan = () => get<DiscoveryPlan>("/plan")
export const getDiscoveryEducation = () => get<DiscoveryEducation>("/education")

/** Schools offering one path's field at one level in one state. The state is not stored. */
export async function getDiscoverySchools(q: SchoolsQuery) {
  const { data } = await agentApi.get<VerticalApiResponse<DiscoverySchools>>(
    `${PREFIX}/education/schools`,
    { params: { cip: q.cip, level: q.level, state: q.state } }
  )
  return data
}

/** DISC-3: Cost and payback for one school's program. No income is sent: none is asked for. */
export async function getDiscoveryCost(q: CostQuery) {
  const { data } = await agentApi.get<VerticalApiResponse<DiscoveryCost>>(`${PREFIX}/cost`, {
    params: { cip: q.cip, level: q.level, school: q.school },
  })
  return data
}

/** The birth year is sent once; the server keeps only an age band. */
export async function recordDiscoveryAge(birthYear: number) {
  const { data } = await agentApi.post<VerticalApiResponse<DiscoveryJourney>>(
    `${PREFIX}/journey/age`,
    { birthYear }
  )
  return data
}

export async function saveDiscoveryAbout(body: { schoolLevel: string | null; interests: string[] }) {
  const { data } = await agentApi.put<VerticalApiResponse<DiscoveryJourney>>(
    `${PREFIX}/journey/about`,
    body
  )
  return data
}

export async function advanceDiscovery(body: { stageId: string; state?: string }) {
  const { data } = await agentApi.post<VerticalApiResponse<DiscoveryJourney>>(
    `${PREFIX}/journey/advance`,
    body
  )
  return data
}

export async function startDiscoveryAlignment() {
  const { data } = await agentApi.post<VerticalApiResponse<DiscoveryJob>>(
    `${PREFIX}/alignment/jobs`
  )
  return data
}
