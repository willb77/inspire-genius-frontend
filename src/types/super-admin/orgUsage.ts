/**
 * Organizations → Action → Activity.
 *
 * Mirrors observability-service `app/org_usage.py`. Usage counts AI responses
 * (one row per answer). Cost is the ESTIMATED AI-model cost only. Voice,
 * hosting and PRISM credits are not recorded per person; `costBasis` says so
 * and the page shows it.
 */

export type UsageTotals = {
  sessions: number
  responses: number
  total_tokens: number
  estimated_cost_usd: number
  /** null = no AI use in the window, not a missing value. */
  last_active_at: string | null
}

export type DailyUsage = {
  date: string
  sessions: number
  responses: number
  active_users: number
  estimated_cost_usd: number
}

export type AgentUsage = { agent_name: string; responses: number; estimated_cost_usd: number }
export type TierUsage = { model_tier: string; responses: number; estimated_cost_usd: number }

export type OrgMemberUsage = UsageTotals & {
  user_id: string
  is_active: boolean | null
}

export type OrgUsage = {
  org_id: string
  window_days: number
  since: string
  cost_basis: string
  totals: {
    members: number
    active_members: number
    sessions: number
    responses: number
    total_tokens: number
    estimated_cost_usd: number
  }
  members: OrgMemberUsage[]
  daily: DailyUsage[]
  by_agent: AgentUsage[]
}

export type MemberSession = {
  session_id: string
  started_at: string | null
  last_at: string | null
  responses: number
  estimated_cost_usd: number
}

export type MemberUsage = {
  org_id: string
  user_id: string
  is_active: boolean | null
  window_days: number
  since: string
  cost_basis: string
  totals: UsageTotals
  daily: DailyUsage[]
  by_agent: AgentUsage[]
  by_model_tier: TierUsage[]
  recent_sessions: MemberSession[]
}

export const USAGE_WINDOWS = [7, 30, 90] as const
export type UsageWindow = (typeof USAGE_WINDOWS)[number]
