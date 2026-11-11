import { agentApi } from "@/lib/agentApi"
import type { SavedJob, SaveJobIn, SaveJobOut } from "@/types/job-fit/savedJobs"

/**
 * JF-7 — Favorites. Every call is the signed-in person's own list: the server
 * takes the owner from the token, so nothing here ever sends a user id.
 */
const PREFIX = "/v1/agents/saved-jobs"
type Envelope<T> = { status: boolean; data: T }

/** Whether Favorites is on for this person (the `job_fit_v2` switch). Not a
 * security check — every data route refuses itself while it is off. */
export async function getSavedJobsEnabled(): Promise<boolean> {
  const { data } = await agentApi.get<Envelope<{ enabled?: unknown }>>(`${PREFIX}/status`)
  return data?.data?.enabled === true
}

export async function getSavedJobs(): Promise<SavedJob[]> {
  const { data } = await agentApi.get<Envelope<{ savedJobs: SavedJob[] }>>(PREFIX)
  return data.data.savedJobs
}

export async function saveJob(body: SaveJobIn): Promise<SaveJobOut> {
  const { data } = await agentApi.post<Envelope<SaveJobOut>>(PREFIX, body)
  return data.data
}

export async function removeSavedJob(jobId: string): Promise<{ jobId: string; removed: boolean }> {
  const { data } = await agentApi.delete<Envelope<{ jobId: string; removed: boolean }>>(
    `${PREFIX}/${encodeURIComponent(jobId)}`,
  )
  return data.data
}
