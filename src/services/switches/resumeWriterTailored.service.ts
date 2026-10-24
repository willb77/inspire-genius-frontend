import { agentApi } from "@/lib/agentApi"

/**
 * RW2: whether Career Fit's "Write résumé" opens the tailored Résumé Writer on
 * this tier (agent-engine `resume_writer_tailored`, default off, no row on any
 * tier until one is written). Not a security check: the server ignores a
 * `jobId` while the switch is off and resolves it through its own org-scoped
 * role read while it is on.
 */
export async function getResumeWriterTailoredEnabled(): Promise<boolean> {
  const { data } = await agentApi.get<{ status: boolean; data: { enabled?: unknown } }>(
    "/v1/agents/switches/resume-writer-tailored",
  )
  return data?.data?.enabled === true
}
