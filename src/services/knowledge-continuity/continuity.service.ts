import { api } from "@/lib/axios"
import type { VerticalApiResponse } from "@/verticals/core"
import type { ContinuityAnalytics, RiskEntry } from "@/types/knowledge-continuity"

const PREFIX = "/v1/trainer/continuity"

/** GET /v1/trainer/continuity/analytics — Program-Health summary. */
export async function getAnalytics(orgId?: string) {
  const { data } = await api.get<VerticalApiResponse<ContinuityAnalytics>>(
    `${PREFIX}/analytics`,
    { params: orgId ? { org_id: orgId } : {} }
  )
  return data
}

/** GET /v1/trainer/continuity/risk-register — full at-risk roster. */
export async function getRiskRegister(orgId?: string) {
  const { data } = await api.get<VerticalApiResponse<RiskEntry[]>>(
    `${PREFIX}/risk-register`,
    { params: orgId ? { org_id: orgId } : {} }
  )
  return data
}
