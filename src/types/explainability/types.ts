export type RoutingHealth = "green" | "amber" | "red"

export type AgentInvolvement = {
  name: string
  turn_count: number
}

export type ConversationSummary = {
  session_id: string
  user_id: string
  user_email: string | null
  message_count: number
  first_seen_at: string
  last_seen_at: string
  agents_involved: AgentInvolvement[]
  routing_health: RoutingHealth
}

export type ConversationsList = {
  status: boolean
  total: number
  page: number
  limit: number
  pages: number
  data: ConversationSummary[]
}

export type RoutingTrace = {
  intent?: string
  intent_class?: string
  intent_score?: number
  confidence?: number
  prior_agent?: string
  carry_decision?: boolean
  reason?: string
  hard_handoff_override?: string | boolean | null
}

export type RagSource = {
  document_id?: string
  chunk_index?: number
  filename?: string
  similarity?: number
  scope?: string
  owner_user_id?: string
}

export type MemoryRecallEntry = {
  tier?: string
  session_id?: string
  age_seconds?: number
  content?: string
}

export type Section1WhichAgent = {
  title: "Which agent responded"
  agent_name: string
  contributing_agents: string[]
  synthesized: boolean
}

export type Section2WhyThisAgent = {
  title: "Why this agent"
  routing_trace: RoutingTrace | null
  summary: string
  template_id?: string | null
}

export type Section3WhatDataWasUsed = {
  title: "What data was used"
  rag_sources: RagSource[]
  memory_recall: MemoryRecallEntry[]
  file_ids: string[]
  source_count: number
  memory_count: number
}

export type Section4Risks = {
  title: "Where it could go wrong"
  flags: string[]
  ok: boolean
}

export type Section5Design = {
  title: "What the design intended"
  agent_role: string
  agent_domain: string
  agent_access: string
  template_id?: string | null
  note: string
}

export type AnalysisSection =
  | Section1WhichAgent
  | Section2WhyThisAgent
  | Section3WhatDataWasUsed
  | Section4Risks
  | Section5Design

export type TurnDetail = {
  turn_id: string
  session_id: string | null
  user_id: string | null
  role: "user" | "assistant" | "system" | string
  agent_name: string | null
  content: string
  sections: AnalysisSection[]
  created_at: string
}

export type ConversationDetail = {
  status: boolean
  session_id: string
  user_id: string | null
  user_email: string | null
  turns: TurnDetail[]
}

export type ConversationListFilters = {
  user_id?: string
  org_id?: string
  agent?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}
