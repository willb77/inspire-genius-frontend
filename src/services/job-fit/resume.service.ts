import { getApi } from "@/lib/agentApi"
import type { WriteResumeResult } from "@/types/job-fit"

/**
 * Job-Fit "Write Résumé" API. Calls the AGENT ENGINE via getApi(); the response
 * is FLAT (read res.data). Drafts a role-aligned résumé from the person's own
 * strengths — an editable draft, never a selection verdict.
 */
export type WriteResumeBody = {
  roleTitle: string
  strengths: string[]
  topDimensions: string[]
  fitContext?: string
  fitScore?: number
}

export const resumeService = {
  /** POST /v1/agents/blueprint/write-resume — flat response. */
  async write(body: WriteResumeBody): Promise<WriteResumeResult> {
    const res = await getApi().post<WriteResumeResult>("/v1/agents/blueprint/write-resume", body)
    return res.data
  },
}
