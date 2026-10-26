import { agentApi } from "@/lib/agentApi"

/**
 * PRISM-RR: whether Replace report may take a PRISM report PDF on its own for
 * the caller (agent-engine `prism_pdf_replace`, read for the caller — tier-wide
 * or their org — default off). Not a security check: the replace route enforces
 * the switch itself and answers today's 422 to a PDF-only upload when it is off.
 */
export async function getPrismPdfReplaceEnabled(): Promise<boolean> {
  const { data } = await agentApi.get<{ status: boolean; data: { enabled?: unknown } }>(
    "/v1/agents/switches/prism-pdf-replace",
  )
  return data?.data?.enabled === true
}
